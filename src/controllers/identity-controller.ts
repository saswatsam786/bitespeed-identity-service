import { Request, Response } from 'express';
import { Logger } from '../utils/logger';
import { IdentityService } from '../services/identity-service';
import { InternalNamespace } from '../dto/internal-namespace';

export class IdentityController {
  private logger: Logger;
  private identityService: IdentityService;

  constructor(identityService: IdentityService) {
    this.logger = Logger.getInstance();
    this.identityService = identityService;
  }

  public identify = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: InternalNamespace.IdentifyRequestBody = req.body;

      // Validate request
      if (!request.email && !request.phoneNumber) {
        res.status(400).json({
          error: 'Either email or phoneNumber must be provided',
        });
        return;
      }

      const result = await this.identityService.identifyContact(request);

      this.logger.info('Identity request processed successfully', {
        request,
        primaryContactId: result.contact.primaryContactId,
      });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error processing identify request', { body: req.body, error });

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  };

  public health = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'healthy',
      timeStamp: new Date().toISOString(),
      service: 'bitespeed-identity-service',
    });
  };
}
