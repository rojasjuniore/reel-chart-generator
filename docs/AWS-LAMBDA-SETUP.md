# AWS Lambda Setup para Remotion

## Environment Variables Requeridas (Vercel)

```
REMOTION_AWS_ACCESS_KEY_ID=<access-key-id>
REMOTION_AWS_SECRET_ACCESS_KEY=<secret-access-key>
REMOTION_AWS_REGION=us-east-1
```

Opcional (si quieres custom bucket):
```
REMOTION_S3_BUCKET_NAME=remotionlambda-<tu-identificador>
```

---

## Setup AWS (Usuario Dedicado - Mínimos Permisos)

### 1. Crear Role Policy
1. IAM → Policies → Create Policy
2. JSON tab → pegar output de: `npx remotion lambda policies role`
3. Nombre EXACTO: `remotion-lambda-policy`

### 2. Crear Role
1. IAM → Roles → Create Role
2. Use case: Lambda
3. Attach policy: `remotion-lambda-policy`
4. Nombre EXACTO: `remotion-lambda-role`

### 3. Crear User (Dedicado)
1. IAM → Users → Create User
2. Nombre: `remotion-user` (o similar)
3. NO habilitar console access
4. Add inline policy: output de `npx remotion lambda policies user`

### 4. Crear Access Key
1. IAM → Users → remotion-user → Security Credentials
2. Create access key → "Application running on AWS compute service"
3. Guardar Access Key ID y Secret Access Key

---

## Permisos del User Policy (Resumen)

El user tiene acceso SOLO a:
- **S3**: Buckets con prefijo `remotionlambda-*`
- **Lambda**: Functions con prefijo `remotion-render-*`
- **CloudWatch Logs**: Logs de las funciones remotion
- **Service Quotas**: Para verificar límites

NO tiene:
- ❌ Admin access
- ❌ Acceso a otros buckets S3
- ❌ Acceso a otras funciones Lambda
- ❌ IAM write (solo PassRole para el role específico)

---

## Deploy Inicial (Una vez desde local)

```bash
# 1. Configurar credenciales localmente
export REMOTION_AWS_ACCESS_KEY_ID=xxx
export REMOTION_AWS_SECRET_ACCESS_KEY=xxx
export REMOTION_AWS_REGION=us-east-1

# 2. Validar permisos
npx remotion lambda policies validate

# 3. Deploy función Lambda
npx remotion lambda functions deploy

# 4. Deploy site (código Remotion)
npx remotion lambda sites create src/index.ts --site-name=reel-chart
```

---

## Uso desde API (Vercel)

```typescript
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";

// Iniciar render
const { renderId, bucketName } = await renderMediaOnLambda({
  region: "us-east-1",
  functionName: "remotion-render-...",
  serveUrl: "https://remotionlambda-xxx.s3.us-east-1.amazonaws.com/sites/reel-chart/index.html",
  composition: "ReelChart",
  inputProps: { /* CSV data */ },
  codec: "h264",
});

// Consultar progreso
const progress = await getRenderProgress({
  renderId,
  bucketName,
  region: "us-east-1",
  functionName: "remotion-render-...",
});

// progress.outputFile contiene URL del MP4 cuando done=true
```

---

## Costos Estimados

- Lambda: ~$0.0001 por segundo de compute (ARM64)
- S3: ~$0.023/GB storage + $0.0004/request
- **Por video 15s**: ~$0.01-0.02 USD

---

## Smoke Test Checklist

- [ ] POST /api/render → devuelve `{ renderId, bucketName }`
- [ ] GET /api/render/[renderId] → devuelve progreso 0-100%
- [ ] Progreso llega a 100% → `downloadUrl` disponible
- [ ] MP4 descargable y válido (1080x1920, 15s, H.264)
