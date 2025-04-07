const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb'); // Import ObjectId properly here
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_temporal';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conexión a MongoDB optimizada para serverless
// Conexión a MongoDB optimizada para serverless
const client = new MongoClient(MONGODB_URI, {
    // Opciones de conexión para entornos serverless
    connectTimeoutMS: 5000,
    socketTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10
});
let dbConnection;

async function getDbConnection() {
    if (!dbConnection) {
        try {
            // Usar promesa con timeout para evitar bloqueos
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Tiempo de conexión agotado')), 5000)
            );
            
            const connectPromise = client.connect();
            await Promise.race([connectPromise, timeoutPromise]);
            
            console.log('Conectado a MongoDB');
            dbConnection = client.db('magic_trading');
        } catch (err) {
            console.error('Error conectando a MongoDB:', err);
            // No lanzar error, solo registrarlo
            return null;
        }
    }
    return dbConnection;
}

// Intentar conectar inicialmente, pero no bloquear
getDbConnection().catch(console.error);

// Manejo de cierre de conexión solo para desarrollo
if (process.env.NODE_ENV !== 'production') {
    process.on('SIGINT', async () => {
        await client.close();
        console.log('Conexión a MongoDB cerrada');
        process.exit(0);
    });
}

// Ruta para el registro
app.post('/api/registro', async (req, res) => {
    const { usuario, email, password } = req.body;

    // Validar datos
    if (!usuario || !email || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    try {
        const db = await getDbConnection();
        if (!db) {
            return res.status(500).json({ message: 'Error al conectar con la base de datos' });
        }
        
        const collection = db.collection('usuarios');

        // Verificar ambas condiciones y recopilar errores
        const errores = [];

        // Verificar si el email ya está registrado
        const emailExistente = await collection.findOne({ email });
        if (emailExistente) {
            errores.push('El email ya está registrado');
        }

        // Verificar si el usuario ya está registrado
        const usuarioExistente = await collection.findOne({ usuario });
        if (usuarioExistente) {
            errores.push('El nombre de usuario ya está registrado');
        }

        // Si hay errores, devolver todos juntos
        if (errores.length > 0) {
            return res.status(400).json({
                message: 'Error de validación',
                errores
            });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Guardar el usuario en la base de datos
        const result = await collection.insertOne({
            usuario,
            email,
            password: hashedPassword,
            fechaRegistro: new Date(),
            wants: [],
            sells: []
        });

        res.status(201).json({ message: 'Usuario registrado con éxito', id: result.insertedId });
    } catch (err) {
        console.error('Error al registrar usuario:', err);
        res.status(500).json({ message: 'Error al registrar usuario' });
    }
});

// Ruta para el login
app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;

    // Validar datos
    if (!usuario || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    try {
        const db = await getDbConnection();
        if (!db) {
            return res.status(500).json({ message: 'Error al conectar con la base de datos' });
        }
        
        const collection = db.collection('usuarios');

        // Buscar el usuario en la base de datos
        const usuarioEncontrado = await collection.findOne({ usuario });
        if (!usuarioEncontrado) {
            return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
        }

        // Verificar la contraseña
        const contraseñaValida = await bcrypt.compare(password, usuarioEncontrado.password);
        if (!contraseñaValida) {
            return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
        }

        // Generar un token JWT
        const token = jwt.sign(
            {
                id: usuarioEncontrado._id,
                usuario: usuarioEncontrado.usuario
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Usuario autenticado con éxito',
            token,
            usuario: usuarioEncontrado.usuario
        });
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        res.status(500).json({ message: 'Error al iniciar sesión' });
    }
});

// Middleware para autenticar token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido o expirado' });
        }
        req.user = user;
        next();
    });
}

// Obtener perfil de usuario
app.get('/api/user/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const db = await getDbConnection();
        if (!db) {
            return res.status(500).json({ message: 'Error al conectar con la base de datos' });
        }
        
        const collection = db.collection('usuarios');

        const user = await collection.findOne({ usuario: username }, { projection: { password: 0 } });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json(user);
    } catch (err) {
        console.error('Error al obtener perfil:', err);
        res.status(500).json({ message: 'Error al obtener perfil' });
    }
});

// Update the want cards endpoint
app.post('/api/user/wants', authenticateToken, async (req, res) => {
    const { cardId, cardName, quantity = 1, setCode = '', edition = '', language = 'English', foil = false, price = 0 } = req.body;
    const userId = req.user.id;

    try {
        const db = await getDbConnection();
        if (!db) {
            return res.status(500).json({ message: 'Error al conectar con la base de datos' });
        }
        
        const collection = db.collection('usuarios');

        // Verificar si la carta ya existe en la lista
        const user = await collection.findOne(
            { _id: new ObjectId(userId), 'wants.cardId': cardId }
        );

        if (user) {
            return res.status(400).json({ message: 'La carta ya está en tu lista de wants' });
        }

        await collection.updateOne(
            { _id: new ObjectId(userId) },
            { $push: { wants: { cardId, cardName, quantity, edition, setCode, language, foil, price, dateAdded: new Date() } } }
        );

        res.status(200).json({ message: 'Carta añadida a wants' });
    } catch (err) {
        console.error('Error al añadir carta:', err);
        res.status(500).json({ message: 'Error al añadir carta' });
    }
});

// Update the sell cards endpoint - this already includes price so no change needed

// Update the sell cards endpoint
app.post('/api/user/sells', authenticateToken, async (req, res) => {
    const { cardId, cardName, quantity = 1, setCode = '', edition = '', language = 'English', foil = false, price = 0 } = req.body;
    const userId = req.user.id;

    try {
        const db = await getDbConnection();
        if (!db) {
            return res.status(500).json({ message: 'Error al conectar con la base de datos' });
        }
        
        const collection = db.collection('usuarios');

        // Verificar si la carta ya existe en la lista
        const user = await collection.findOne(
            { _id: new ObjectId(userId), 'sells.cardId': cardId }
        );

        if (user) {
            return res.status(400).json({ message: 'La carta ya está en tu lista de sells' });
        }

        await collection.updateOne(
            { _id: new ObjectId(userId) },
            { $push: { sells: { cardId, cardName, quantity, edition, setCode, language, foil, price, dateAdded: new Date() } } }
        );

        res.status(200).json({ message: 'Carta añadida a sells' });
    } catch (err) {
        console.error('Error al añadir carta:', err);
        res.status(500).json({ message: 'Error al añadir carta' });
    }
});

// Actualizar carta en wants
app.put('/api/user/wants/:cardId', authenticateToken, async (req, res) => {
    const { cardId } = req.params;
    const { quantity, edition, language, foil, price = 0, setCode = '' } = req.body;
    const userId = req.user.id;

    try {
        const db = await getDbConnection();
        if (!db) {
            return res.status(500).json({ message: 'Error al conectar con la base de datos' });
        }
        
        const collection = db.collection('usuarios');

        await collection.updateOne(
            { _id: new ObjectId(userId), "wants.cardId": cardId },
            { $set: {
                    "wants.$.quantity": quantity,
                    "wants.$.edition": edition,
                    "wants.$.language": language,
                    "wants.$.foil": foil,
                    "wants.$.price": price,
                    "wants.$.setCode": setCode
                } }
        );

        res.status(200).json({ message: 'Carta actualizada en wants' });
    } catch (err) {
        console.error('Error al actualizar carta:', err);
        res.status(500).json({ message: 'Error al actualizar carta' });
    }
});

// Actualizar carta en sells
app.put('/api/user/sells/:cardId', authenticateToken, async (req, res) => {
    const { cardId } = req.params;
    const { quantity, edition, language, foil, price, setCode = '' } = req.body;
    const userId = req.user.id;

    try {
        const db = await getDbConnection();
        if (!db) {
            return res.status(500).json({ message: 'Error al conectar con la base de datos' });
        }
        
        const collection = db.collection('usuarios');

        await collection.updateOne(
            { _id: new ObjectId(userId), "sells.cardId": cardId },
            { $set: {
                    "sells.$.quantity": quantity,
                    "sells.$.edition": edition,
                    "sells.$.language": language,
                    "sells.$.foil": foil,
                    "sells.$.price": price,
                    "sells.$.setCode": setCode
                } }
        );

        res.status(200).json({ message: 'Carta actualizada en sells' });
    } catch (err) {
        console.error('Error al actualizar carta:', err);
        res.status(500).json({ message: 'Error al actualizar carta' });
    }
});

// Eliminar carta de wants
app.delete('/api/user/wants/:cardId', authenticateToken, async (req, res) => {
    const { cardId } = req.params;
    const userId = req.user.id;

    try {
        const db = await getDbConnection();
        if (!db) {
            return res.status(500).json({ message: 'Error al conectar con la base de datos' });
        }
        
        const collection = db.collection('usuarios');

        await collection.updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { wants: { cardId } } }
        );

        res.status(200).json({ message: 'Carta eliminada de wants' });
    } catch (err) {
        console.error('Error al eliminar carta:', err);
        res.status(500).json({ message: 'Error al eliminar carta' });
    }
});

// Eliminar carta de sells
app.delete('/api/user/sells/:cardId', authenticateToken, async (req, res) => {
    const { cardId } = req.params;
    const userId = req.user.id;

    try {
        const db = await getDbConnection();
        if (!db) {
            return res.status(500).json({ message: 'Error al conectar con la base de datos' });
        }
        
        const collection = db.collection('usuarios');

        await collection.updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { sells: { cardId } } }
        );

        res.status(200).json({ message: 'Carta eliminada de sells' });
    } catch (err) {
        console.error('Error al eliminar carta:', err);
        res.status(500).json({ message: 'Error al eliminar carta' });
    }
});

// Obtener detalles del usuario autenticado
app.get('/api/user/profile/me', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const db = await getDbConnection();
        if (!db) {
            return res.status(500).json({ message: 'Error al conectar con la base de datos' });
        }
        
        const collection = db.collection('usuarios');

        const user = await collection.findOne(
            { _id: new ObjectId(userId) },
            { projection: { password: 0 } }
        );

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error('Error al obtener perfil:', err);
        res.status(500).json({ message: 'Error al obtener perfil' });
    }
});

// Ruta principal
app.get('/', (req, res) => {
    res.json({ message: '¡Bienvenido al backend de Magic Trading!', status: 'OK' });
});

// Ruta de diagnóstico
// Ruta de diagnóstico - versión más robusta
app.get('/api/status', async (req, res) => {
    try {
        let status = {
            server: 'OK',
            mongodb: 'No probado',
            environment: process.env.NODE_ENV || 'development',
            mongodbUri: process.env.MONGODB_URI ? 'Configurado (ocultado)' : 'No configurado'
        };
        
        // Evitar timeout en Vercel
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tiempo de espera agotado')), 5000)
        );
        
        try {
            // Intenta conectar a MongoDB con timeout
            const dbPromise = getDbConnection();
            const db = await Promise.race([dbPromise, timeoutPromise]);
            
            if (db) {
                status.mongodb = 'Conectado';
                status.databaseName = db.databaseName;
                
                // Lista colecciones con timeout
                try {
                    const collectionsPromise = db.listCollections().toArray();
                    const collections = await Promise.race([collectionsPromise, timeoutPromise]);
                    status.collections = collections.map(col => col.name);
                } catch (collErr) {
                    status.collectionsError = 'Error al listar colecciones: ' + collErr.message;
                }
            }
        } catch (dbErr) {
            status.mongodb = 'Error: ' + dbErr.message;
        }
        
        res.json(status);
    } catch (err) {
        console.error('Error al verificar estado:', err);
        res.status(500).json({ 
            status: 'Error',
            error: err.message
        });
    }
});

// Ruta de diagnóstico básica que no depende de MongoDB
app.get('/api/basic-status', (req, res) => {
    res.json({
        server: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        envVars: {
            mongodbUri: process.env.MONGODB_URI ? 'Configurado (ocultado)' : 'No configurado',
            jwtSecret: process.env.JWT_SECRET ? 'Configurado (ocultado)' : 'No configurado'
        }
    });
});

// Al final de tu archivo index.js, después de todas las rutas

// Para desarrollo local
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Servidor backend corriendo en http://localhost:${port}`);
    });
}

// Exportar la app para Vercel y otros entornos hr
module.exports = app;