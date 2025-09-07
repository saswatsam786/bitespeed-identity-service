import { DatabaseConnection } from '../database/connection';
import { InternalNamespace } from '../dto/internal-namespace';
import { Logger } from '../utils/logger';

export class Contact {
  private db: DatabaseConnection;
  private logger: Logger;

  constructor(db: DatabaseConnection) {
    this.db = db;
    this.logger = Logger.getInstance();
  }

  public async findByEmailOrPhone(
    email?: string,
    phoneNumber?: string,
  ): Promise<InternalNamespace.Contact[]> {
    const conditions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    let paramIndex = 1;

    if (email) {
      conditions.push(`email = $${paramIndex}`);
      params.push(email);
      paramIndex++;
    }

    if (phoneNumber) {
      conditions.push(`phone_number = $${paramIndex}`);
      params.push(phoneNumber);
      paramIndex++;
    }

    if (conditions.length === 0) {
      return [];
    }

    const query = `
      SELECT id, phone_number, email, linked_id, link_precedence, 
             created_at, updated_at, deleted_at
      FROM contacts 
      WHERE deleted_at IS NULL AND (${conditions.join(' OR ')})
      ORDER BY created_at ASC
    `;

    try {
      const result = await this.db.query(query, params);
      return result.rows.map(this.mapRowToContact);
    } catch (error) {
      this.logger.error('Error finding contacts by email or phone', { email, phoneNumber, error });
      throw error;
    }
  }

  public async findLinkedContacts(primaryId: number): Promise<InternalNamespace.Contact[]> {
    const query = `
      SELECT id, phone_number, email, linked_id, link_precedence, 
             created_at, updated_at, deleted_at
      FROM contacts 
      WHERE deleted_at IS NULL AND (id = $1 OR linked_id = $1)
      ORDER BY created_at ASC
    `;

    try {
      const result = await this.db.query(query, [primaryId]);
      return result.rows.map(this.mapRowToContact);
    } catch (error) {
      this.logger.error('Error finding linked contacts', { primaryId, error });
      throw error;
    }
  }

  public async create(
    contactData: Omit<InternalNamespace.Contact, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<InternalNamespace.Contact> {
    const query = `
      INSERT INTO contacts (phone_number, email, linked_id, link_precedence)
      VALUES ($1, $2, $3, $4)
      RETURNING id, phone_number, email, linked_id, link_precedence, 
                created_at, updated_at, deleted_at
    `;

    const params = [
      contactData.phoneNumber,
      contactData.email,
      contactData.linkedId,
      contactData.linkPrecedence,
    ];

    try {
      const result = await this.db.query(query, params);
      const contact = this.mapRowToContact(result.rows[0]);
      this.logger.info('Contact created', { contactId: contact.id });
      return contact;
    } catch (error) {
      this.logger.error('Error creating contact', { contactData, error });
      throw error;
    }
  }

  public async updateLinkPrecedence(
    id: number,
    linkedId: number,
  ): Promise<InternalNamespace.Contact> {
    const query = `
      UPDATE contacts 
      SET linked_id = $1, link_precedence = 'secondary', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, phone_number, email, linked_id, link_precedence, 
                created_at, updated_at, deleted_at
    `;

    try {
      const result = await this.db.query(query, [linkedId, id]);
      if (result.rows.length === 0) {
        throw new Error('Contact not found or already deleted');
      }
      const contact = this.mapRowToContact(result.rows[0]);
      this.logger.info('Contact link precedence updated', { contactId: id, linkedId });
      return contact;
    } catch (error) {
      this.logger.error('Error updating contact link precedence', { id, linkedId, error });
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRowToContact(row: any): InternalNamespace.Contact {
    return {
      id: row.id,
      phoneNumber: row.phone_number,
      email: row.email,
      linkedId: row.linked_id,
      linkPrecedence: row.link_precedence,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }
}
