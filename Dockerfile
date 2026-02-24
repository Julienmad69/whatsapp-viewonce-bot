FROM node:18-slim

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du reste du code
COPY . .

# Création du dossier session
RUN mkdir -p /app/session

# Exposition du port
EXPOSE 8000

# Commande de démarrage
CMD ["npm", "start"]
