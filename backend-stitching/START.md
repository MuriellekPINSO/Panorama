# 🚀 Démarrage Rapide du Backend

## Installation en 3 étapes

### 1. Installer les dépendances
```bash
cd backend-stitching
npm install
```

### 2. Installer OpenCV (Python)
```bash
# Windows
pip install opencv-python

# Mac/Linux
pip3 install opencv-python
```

### 3. Démarrer le serveur
```bash
npm start
```

✅ Le serveur est prêt sur `http://localhost:3000`

## Configurer l'application mobile

Dans `app/(tabs)/create.tsx`, trouvez et modifiez cette ligne:

```typescript
// Remplacez par votre IP locale (pas localhost sur mobile!)
const STITCHING_SERVER_URL = 'http://192.168.X.X:3000';
```

Pour trouver votre IP:
- Windows: `ipconfig`
- Mac/Linux: `ifconfig` ou `ip addr`

## Tester le serveur

```bash
curl http://localhost:3000/api/health
```

Réponse attendue:
```json
{
  "status": "ok",
  "capabilities": {
    "pythonOpenCV": true
  }
}
```
