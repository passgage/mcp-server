import { z } from 'zod';
import { BaseTool } from '../base.tool.js';
import { ToolMetadata } from '../index.js';
import { PassgageAPIClient } from '../../api/client.js';

const generatePresignedUrlSchema = z.object({
  filename: z.string().min(1).describe('Name of the file to upload'),
  content_type: z.string().optional().describe('MIME type of the file (optional)'),
  folder: z.enum(['avatars', 'documents', 'reports', 'attachments']).optional().describe('Upload folder category'),
  public: z.boolean().optional().default(false).describe('Whether file should be publicly accessible')
});

const confirmUploadSchema = z.object({
  upload_id: z.string().uuid().describe('Upload ID from presigned URL response'),
  etag: z.string().optional().describe('ETag returned from S3 upload (optional)')
});

const getFileSchema = z.object({
  file_id: z.string().uuid().describe('File ID to retrieve')
});

const deleteFileSchema = z.object({
  file_id: z.string().uuid().describe('File ID to delete')
});

const listFilesSchema = z.object({
  page: z.number().int().positive().optional().default(1).describe('Page number'),
  per_page: z.number().int().positive().max(50).optional().default(25).describe('Items per page (max 50)'),
  q: z.record(z.any()).optional().describe('Ransack query filters')
});

export class GeneratePresignedUrlTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_generate_presigned_url',
      description: 'Generate presigned URL for secure file upload to Passgage storage',
      category: 'file-upload',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return generatePresignedUrlSchema;
  }

  async execute(args: z.infer<typeof generatePresignedUrlSchema>): Promise<any> {
    const validated = generatePresignedUrlSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.post('/api/public/v1/file_uploads/presigned_url', {
        filename: validated.filename,
        content_type: validated.content_type,
        folder: validated.folder,
        public: validated.public
      });

      if (response.success && response.data) {
        return this.successResponse({
          upload_id: response.data.upload_id,
          presigned_url: response.data.presigned_url,
          upload_fields: response.data.upload_fields,
          expires_at: response.data.expires_at,
          max_file_size: response.data.max_file_size,
          allowed_content_types: response.data.allowed_content_types
        }, 'Presigned URL generated successfully');
      } else {
        return this.errorResponse('Failed to generate presigned URL', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Generate presigned URL failed', error.message);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          filename: {
            type: 'string',
            description: 'Name of the file to upload',
            minLength: 1
          },
          content_type: {
            type: 'string',
            description: 'MIME type of the file (optional)'
          },
          folder: {
            type: 'string',
            enum: ['avatars', 'documents', 'reports', 'attachments'],
            description: 'Upload folder category'
          },
          public: {
            type: 'boolean',
            description: 'Whether file should be publicly accessible',
            default: false
          }
        },
        required: ['filename']
      }
    };
  }
}

export class ConfirmUploadTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_confirm_upload',
      description: 'Confirm file upload completion and register file in Passgage system',
      category: 'file-upload',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return confirmUploadSchema;
  }

  async execute(args: z.infer<typeof confirmUploadSchema>): Promise<any> {
    const validated = confirmUploadSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.post(`/api/public/v1/file_uploads/${validated.upload_id}/confirm`, {
        etag: validated.etag
      });

      if (response.success && response.data) {
        return this.successResponse({
          file_id: response.data.file_id,
          filename: response.data.filename,
          content_type: response.data.content_type,
          file_size: response.data.file_size,
          public_url: response.data.public_url,
          download_url: response.data.download_url,
          created_at: response.data.created_at
        }, 'File upload confirmed successfully');
      } else {
        return this.errorResponse('Failed to confirm upload', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Confirm upload failed', error.message);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          upload_id: {
            type: 'string',
            format: 'uuid',
            description: 'Upload ID from presigned URL response'
          },
          etag: {
            type: 'string',
            description: 'ETag returned from S3 upload (optional)'
          }
        },
        required: ['upload_id']
      }
    };
  }
}

export class GetFileTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_get_file',
      description: 'Get file information and download URL by file ID',
      category: 'file-upload',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return getFileSchema;
  }

  async execute(args: z.infer<typeof getFileSchema>): Promise<any> {
    const validated = getFileSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.getById('/api/public/v1/file_uploads', validated.file_id);

      if (response.success && response.data) {
        return this.successResponse({
          file_id: response.data.id,
          filename: response.data.filename,
          content_type: response.data.content_type,
          file_size: response.data.file_size,
          folder: response.data.folder,
          public: response.data.public,
          public_url: response.data.public_url,
          download_url: response.data.download_url,
          uploaded_by: response.data.uploaded_by,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at
        }, 'File retrieved successfully');
      } else {
        return this.errorResponse('File not found', response.message || 'File does not exist');
      }
    } catch (error: any) {
      return this.errorResponse('Get file failed', error.message);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          file_id: {
            type: 'string',
            format: 'uuid',
            description: 'File ID to retrieve'
          }
        },
        required: ['file_id']
      }
    };
  }
}

export class DeleteFileTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_delete_file',
      description: 'Delete file from Passgage storage',
      category: 'file-upload',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return deleteFileSchema;
  }

  async execute(args: z.infer<typeof deleteFileSchema>): Promise<any> {
    const validated = deleteFileSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.delete('/api/public/v1/file_uploads', validated.file_id);

      if (response.success) {
        return this.successResponse({
          deleted: true,
          file_id: validated.file_id
        }, 'File deleted successfully');
      } else {
        return this.errorResponse('Failed to delete file', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Delete file failed', error.message);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          file_id: {
            type: 'string',
            format: 'uuid',
            description: 'File ID to delete'
          }
        },
        required: ['file_id']
      }
    };
  }
}

export class ListFilesTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_list_files',
      description: 'List uploaded files with filtering and pagination support',
      category: 'file-upload',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return listFilesSchema;
  }

  async execute(args: z.infer<typeof listFilesSchema>): Promise<any> {
    const validated = listFilesSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const params: any = {
        page: validated.page,
        per_page: validated.per_page
      };

      if (validated.q) {
        params.q = validated.q;
      }

      const response = await this.apiClient.get('/api/public/v1/file_uploads', params);

      if (response.success && response.data) {
        const files = Array.isArray(response.data) ? response.data : [];
        return this.successResponse({
          files: files.map(file => ({
            file_id: file.id,
            filename: file.filename,
            content_type: file.content_type,
            file_size: file.file_size,
            folder: file.folder,
            public: file.public,
            public_url: file.public_url,
            uploaded_by: file.uploaded_by,
            created_at: file.created_at
          })),
          total_count: files.length,
          current_page: validated.page,
          per_page: validated.per_page
        }, `Found ${files.length} files`);
      } else {
        return this.errorResponse('Failed to list files', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('List files failed', error.message);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            description: 'Page number',
            default: 1
          },
          per_page: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: 'Items per page (max 50)',
            default: 25
          },
          q: {
            type: 'object',
            description: 'Ransack query filters',
            additionalProperties: true
          }
        }
      }
    };
  }
}