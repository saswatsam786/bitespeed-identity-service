import { Contact } from '../models/contact';
import { InternalNamespace } from '../dto/internal-namespace';
import { Logger } from '../utils/logger';

export class IdentityService {
  private contactModel: Contact;
  private logger: Logger;

  constructor(contactModel: Contact) {
    this.contactModel = contactModel;
    this.logger = Logger.getInstance();
  }

  public async identifyContact(
    request: InternalNamespace.IdentifyRequestBody,
  ): Promise<InternalNamespace.IdentifyResponseBody> {
    this.logger.info('Processing identify request', { request });

    if (!request.email && !request.phoneNumber) {
      throw new Error('Either email or phoneNumber must be provided');
    }

    try {
      // Find existing contacts with matching email or phone
      const existingContacts = await this.contactModel.findByEmailOrPhone(
        request.email,
        request.phoneNumber,
      );

      if (existingContacts.length === 0) {
        // No existing contact found, create new primary contact
        return await this.createNewPrimaryContact(request);
      }

      // Check for different primary contacts that need to be linked
      const primaryContacts = existingContacts.filter(
        (c) => c.linkPrecedence === InternalNamespace.LinkPrecedence.PRIMARY,
      );

      if (primaryContacts.length > 1) {
        // Multiple primary contacts found, need to merge them
        return await this.mergePrimaryContacts(primaryContacts, request);
      }

      // Single primary contact or secondary contacts found
      const primaryContact =
        primaryContacts[0] ||
        (await this.contactModel.findLinkedContacts(existingContacts[0].linkedId!))[0];

      // Get all linked contacts to check if we need a new secondary
      const allLinkedContacts = await this.contactModel.findLinkedContacts(primaryContact.id!);

      // Check if we need to create a new secondary contact
      const needsNewSecondary = this.needsNewSecondaryContact(allLinkedContacts, request);

      if (needsNewSecondary) {
        await this.contactModel.create({
          phoneNumber: request.phoneNumber,
          email: request.email,
          linkedId: primaryContact.id,
          linkPrecedence: InternalNamespace.LinkPrecedence.SECONDARY,
        });
      }

      // Return consolidated contact information
      return await this.buildResponse(primaryContact.id!);
    } catch (error) {
      this.logger.error('Error in identifyContact', { request, error });
      throw error;
    }
  }

  private async createNewPrimaryContact(
    request: InternalNamespace.IdentifyRequestBody,
  ): Promise<InternalNamespace.IdentifyResponseBody> {
    const newContact = await this.contactModel.create({
      phoneNumber: request.phoneNumber,
      email: request.email,
      linkedId: null,
      linkPrecedence: InternalNamespace.LinkPrecedence.PRIMARY,
    });

    return {
      contact: {
        primaryContactId: newContact.id!,
        emails: newContact.email ? [newContact.email] : [],
        phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
        secondaryContactIds: [],
      },
    };
  }

  private async mergePrimaryContacts(
    primaryContacts: InternalNamespace.Contact[],
    request: InternalNamespace.IdentifyRequestBody,
  ): Promise<InternalNamespace.IdentifyResponseBody> {
    // Sort by creation date to determine which should remain primary
    primaryContacts.sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());

    const remainingPrimary = primaryContacts[0];
    const contactsToMerge = primaryContacts.slice(1);

    // Convert other primary contacts to secondary
    for (const contact of contactsToMerge) {
      await this.contactModel.updateLinkPrecedence(contact.id!, remainingPrimary.id!);
    }

    // 🚨 CRITICAL FIX: For merge scenarios, we should NOT create a new secondary
    // because the merge itself handles the linking of the request data
    // The request data is already represented by the combination of the merged contacts

    // ✅ Check if the request data is completely covered by the merge
    const isRequestDataCoveredByMerge = this.isRequestCoveredByContacts(primaryContacts, request);

    if (!isRequestDataCoveredByMerge) {
      // Only create new secondary if the request contains truly new information
      // that wasn't in any of the original primary contacts
      await this.contactModel.create({
        phoneNumber: request.phoneNumber,
        email: request.email,
        linkedId: remainingPrimary.id,
        linkPrecedence: InternalNamespace.LinkPrecedence.SECONDARY,
      });
    }

    return await this.buildResponse(remainingPrimary.id!);
  }

  // ✅ NEW METHOD: Check if request is completely covered by existing contacts
  private isRequestCoveredByContacts(
    contacts: InternalNamespace.Contact[],
    request: InternalNamespace.IdentifyRequestBody,
  ): boolean {
    // If request has both email and phone
    if (request.email && request.phoneNumber) {
      // Check if email exists in any contact AND phone exists in any contact
      const emailExists = contacts.some((c) => c.email === request.email);
      const phoneExists = contacts.some((c) => c.phoneNumber === request.phoneNumber);

      // For merge scenarios, if both email and phone exist separately in the contacts,
      // then the request is covered by the merge (no new secondary needed)
      return emailExists && phoneExists;
    }

    // If request has only email
    if (request.email && !request.phoneNumber) {
      return contacts.some((c) => c.email === request.email);
    }

    // If request has only phone
    if (request.phoneNumber && !request.email) {
      return contacts.some((c) => c.phoneNumber === request.phoneNumber);
    }

    return false;
  }

  // ✅ SIMPLIFIED: This method is now only for non-merge scenarios
  private needsNewSecondaryContact(
    existingContacts: InternalNamespace.Contact[],
    request: InternalNamespace.IdentifyRequestBody,
  ): boolean {
    // Check if the exact combination of email and phone already exists
    const exactMatch = existingContacts.some(
      (contact) => contact.email === request.email && contact.phoneNumber === request.phoneNumber,
    );

    if (exactMatch) {
      return false; // Don't create new contact if exact match exists
    }

    // Check if request contains only information that already exists separately
    const emailExists = request.email
      ? existingContacts.some((c) => c.email === request.email)
      : true;
    const phoneExists = request.phoneNumber
      ? existingContacts.some((c) => c.phoneNumber === request.phoneNumber)
      : true;

    // If both email and phone provided
    if (request.email && request.phoneNumber) {
      // Create new secondary only if the exact combination doesn't exist
      return !exactMatch;
    }

    // If only email provided, create new secondary only if email doesn't exist
    if (request.email && !request.phoneNumber) {
      return !emailExists;
    }

    // If only phone provided, create new secondary only if phone doesn't exist
    if (request.phoneNumber && !request.email) {
      return !phoneExists;
    }

    return false;
  }

  private async buildResponse(
    primaryContactId: number,
  ): Promise<InternalNamespace.IdentifyResponseBody> {
    const linkedContacts = await this.contactModel.findLinkedContacts(primaryContactId);

    const primary = linkedContacts.find(
      (c) => c.linkPrecedence === InternalNamespace.LinkPrecedence.PRIMARY,
    )!;
    const secondaries = linkedContacts.filter(
      (c) => c.linkPrecedence === InternalNamespace.LinkPrecedence.SECONDARY,
    );

    // Collect all unique emails and phone numbers
    const emails = new Set<string>();
    const phoneNumbers = new Set<string>();

    // Add primary contact data first
    if (primary.email) emails.add(primary.email);
    if (primary.phoneNumber) phoneNumbers.add(primary.phoneNumber);

    // Add secondary contact data
    secondaries.forEach((contact) => {
      if (contact.email) emails.add(contact.email);
      if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    });

    // Convert to arrays with primary data first
    const emailArray = Array.from(emails);
    const phoneArray = Array.from(phoneNumbers);

    // Ensure primary email is first
    if (primary.email && emailArray[0] !== primary.email) {
      const primaryEmailIndex = emailArray.indexOf(primary.email);
      [emailArray[0], emailArray[primaryEmailIndex]] = [
        emailArray[primaryEmailIndex],
        emailArray[0],
      ];
    }

    // Ensure primary phone is first
    if (primary.phoneNumber && phoneArray[0] !== primary.phoneNumber) {
      const primaryPhoneIndex = phoneArray.indexOf(primary.phoneNumber);
      [phoneArray[0], phoneArray[primaryPhoneIndex]] = [
        phoneArray[primaryPhoneIndex],
        phoneArray[0],
      ];
    }

    return {
      contact: {
        primaryContactId: primary.id!,
        emails: emailArray,
        phoneNumbers: phoneArray,
        secondaryContactIds: secondaries.map((c) => c.id!),
      },
    };
  }
}
