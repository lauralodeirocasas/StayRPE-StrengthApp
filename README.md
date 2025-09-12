# StayRPE

**StayRPE** es una aplicación multiplataforma para la gestión y seguimiento de entrenamientos de fuerza, orientada a la planificación avanzada y análisis del progreso mediante periodización y metodologías modernas como RPE (Rate of Perceived Exertion) y RIR (Reps in Reserve). Desarrollada como proyecto final del ciclo de Desarrollo de Aplicaciones Multiplataforma (DAM).

## Descripción

StayRPE permite planificar, ejecutar y analizar rutinas deportivas de fuerza a través de un sistema de macrociclos y microciclos, facilitando la personalización granular de entrenamientos. La aplicación incluye:

- **Creación y gestión de rutinas**: Permite definir ejercicios, series, repeticiones, pesos, intensidad (RPE/RIR) y tiempos de descanso.
- **Planificación de macrociclos y microciclos**: Estructura los entrenamientos en ciclos a medio y largo plazo.
- **Historial y análisis de entrenamientos**: Registra métricas detalladas (volumen, intensidad, duración, etc.) para el seguimiento del progreso.
- **Personalización avanzada**: Modificación de parámetros específicos para días concretos sin alterar la rutina base.
- **Seguridad**: Autenticación JWT y control de acceso por roles.

## Tecnologías utilizadas

- **Frontend**: React Native (Expo)
- **Backend**: Java Spring Boot
- **Base de datos**: MySQL + JPA/Hibernate
- **Seguridad**: JWT (JSON Web Tokens), BCrypt
- **Otros**: TypeScript, Lombok, Express.js

## Instalación y puesta en marcha

### Requisitos previos

**Backend**
- Java 17 o superior
- Maven 3.6+
- MySQL 8.0+
- MySQL Workbench (opcional para gestión visual)

**Frontend**
- Node.js 18+
- npm o yarn
- Expo CLI (`npm install -g @expo/cli`)
- Dispositivo móvil con Expo Go o emulador Android/iOS

### Instalación

**1. Backend**
- Clona el repositorio backend.
- Crea la base de datos ejecutando en MySQL:
  ```sql
  CREATE DATABASE stayrpe;
  ```
- Configura `application.properties` con los datos de tu base de datos.
- Lanza el backend:
  ```
  mvn spring-boot:run
  ```
- Hibernate creará las tablas necesarias automáticamente.

**2. Frontend**
- Clona el repositorio frontend.
- Instala dependencias:
  ```
  npm install
  ```
- Configura la URL del backend en la variable `API_URL`.
- Lanza la app:
  ```
  npx expo start
  ```

## Estructura del proyecto

- **stayrpe-backend/**: Código fuente Java, configuración y scripts SQL.
- **stayrpe-frontend/**: Código fuente React Native, pantallas, componentes y configuración.

## Datos de prueba

Puedes registrar nuevos usuarios desde la aplicación. Se recomienda crear, para pruebas:

- Usuario administrador:  
  Email: `admin@stayrpe.com`  
  Contraseña: `123456`

- Usuario atleta:  
  Email: `atleta@stayrpe.com`  
  Contraseña: `123456`

## Documentación

El proyecto incluye:
- Manual de instalación y configuración.
- Manual de usuario.
- Diagramas de arquitectura, base de datos y flujo de trabajo.
- Explicación de decisiones de diseño, problemas encontrados y soluciones implementadas.

## Autoría

- **Autor**: Laura Lodeiro Casas  
