export namespace InternalNamespace {
  export const enum LinkPrecedence {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
  }

  export interface Contact {
    id?: number;
    phoneNumber?: string | null;
    email?: string | null;
    linkedId?: number | null;
    linkPrecedence: LinkPrecedence;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }

  export interface IdentifyRequestBody {
    email?: string;
    phoneNumber?: string;
  }

  export interface IdentifyResponseBody {
    contact: {
      primaryContactId: number;
      emails: string[];
      phoneNumbers: string[];
      secondaryContactIds: number[];
    };
  }
}
