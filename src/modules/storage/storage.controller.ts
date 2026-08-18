import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Only allow image files
      if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    }
  }))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    const url = await this.storageService.uploadImage(file, 'uploads');
    
    return {
      message: 'File uploaded successfully',
      url
    };
  }
}
