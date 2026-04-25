import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import { ZodError, ZodSchema } from 'zod'

type ZodDtoLike = {
  schema?: ZodSchema
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const metatype = metadata.metatype as ZodDtoLike | undefined
    const schema = this.schema ?? metatype?.schema

    if (!schema) {
      return value
    }

    try {
      return schema.parse(value)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          issues: error.flatten(),
        })
      }

      throw error
    }
  }
}
