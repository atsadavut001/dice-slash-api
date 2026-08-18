import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(StorageService.name);
  private readonly bucketName: string;
  private readonly projectId: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'DiceSlashBucket';
    this.projectId = this.configService.get<string>('S3_PROJECT_ID') || '';
    
    this.s3Client = new S3Client({
      forcePathStyle: true,
      region: this.configService.get<string>('S3_REGION') || 'ap-southeast-1',
      endpoint: this.configService.get<string>('S3_ENDPOINT') || '',
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY') || '',
      }
    });
  }

  async uploadImage(file: any, folder: string = 'images'): Promise<string> {
    try {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${folder}/${uuidv4()}.${fileExt}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      // Return the Supabase public URL
      return `https://${this.projectId}.supabase.co/storage/v1/object/public/${this.bucketName}/${fileName}`;
    } catch (error) {
      this.logger.error('Error uploading to Supabase S3:', error);
      throw error;
    }
  }

  async deleteImage(path: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      this.logger.error('Error deleting from Supabase S3:', error);
      return false;
    }
  }
}

