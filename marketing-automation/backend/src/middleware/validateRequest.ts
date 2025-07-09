import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

type ValidationTarget = 'body' | 'query' | 'params';

export const validateRequest = (schema: Joi.ObjectSchema, target: ValidationTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[target];
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      return next(new AppError(`Validation error: ${errorMessage}`, 400));
    }

    // Replace request data with validated values
    req[target] = value;
    next();
  };
};