import { Request, Response } from 'express';
import { Logger } from '../utils/logger';

export class IdentityController {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  public health = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'healthy',
      timeStamp: new Date().toISOString(),
      service: 'bitespeed-identity-service',
    });
  };
}
