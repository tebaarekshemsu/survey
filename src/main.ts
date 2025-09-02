import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from "./app.module";
 
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  // Custom JSON parsing middleware for all routes except Better Auth
  app.use((req, res, next) => {
    // Skip raw parsing for Better Auth endpoints
    if (req.originalUrl.startsWith('/api/auth')) {
      return next();
    }
    // Only parse methods with a body
    const methodsWithBody = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!methodsWithBody.includes(req.method)) {
      return next();
    }
    // Buffer and parse JSON body
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { (req as any).body = JSON.parse(raw); }
      catch { (req as any).body = {}; }
      next();
    });
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