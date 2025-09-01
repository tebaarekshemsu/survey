import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from "./app.module";
 
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, 
  });
  app.enableCors();
  // Swagger Documentation
  const config = new DocumentBuilder()
   .setTitle('Survey')
   .setDescription('The Survey API description')
   .setVersion('1.0')
   .addTag('Surveys')
   .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);


  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();