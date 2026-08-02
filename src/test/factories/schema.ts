import type { JsonSchema } from '@shared/document'

/** Flat schema used by editor machine and view-model tests. */
export const testIdNumberSchema: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: { id: { type: 'number' } },
  required: ['id'],
}

/** Flat schema used by editor machine orchestration tests. */
export const testStatusSchema: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: { status: { type: 'string' } },
  required: ['status'],
}

/** Quicktype-shaped fixtures for document-draft tests. */
export const draftIdStringSchema: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $ref: '#/definitions/Specimen',
  definitions: {
    Specimen: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string', format: 'integer' },
      },
      required: ['id'],
      title: 'Specimen',
    },
  },
}

export const draftIdOptionalSchema: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $ref: '#/definitions/Specimen',
  definitions: {
    Specimen: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string', format: 'integer' },
      },
      required: [],
      title: 'Specimen',
    },
  },
}

export const draftStatusSchema: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $ref: '#/definitions/Specimen',
  definitions: {
    Specimen: {
      type: 'object',
      additionalProperties: false,
      properties: {
        status: { type: 'string' },
      },
      required: ['status'],
      title: 'Specimen',
    },
  },
}

export const draftIdNumberSchema: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $ref: '#/definitions/Specimen',
  definitions: {
    Specimen: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'integer' },
      },
      required: ['id'],
      title: 'Specimen',
    },
  },
}

export const draftIdAndNameSchema: JsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $ref: '#/definitions/Specimen',
  definitions: {
    Specimen: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string', format: 'integer' },
        name: { type: 'string' },
      },
      required: ['id', 'name'],
      title: 'Specimen',
    },
  },
}
