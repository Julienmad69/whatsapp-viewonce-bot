FROM node:20-bullseye-slim

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du reste du code
COPY . .

# Exposition du port (optionnel)
EXPOSE 8000

# Commande de démarrage
CMD ["npm", "start"]
