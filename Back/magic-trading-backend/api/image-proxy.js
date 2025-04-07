const axios = require('axios');
const sharp = require('sharp');

module.exports = async (req, res) => {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Responder a las peticiones OPTIONS directamente (pre-flight CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Extraer parámetros
    const { url, width } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    // Descargar la imagen original
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 5000  // 5 segundos de timeout
    });
    
    // Optimizar la imagen
    let sharpInstance = sharp(response.data);
    
    // Si se especifica un ancho, redimensionar manteniendo la proporción
    if (width) {
      const widthValue = parseInt(width, 10);
      if (!isNaN(widthValue) && widthValue > 0) {
        sharpInstance = sharpInstance.resize({
          width: widthValue,
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }
    
    // Convertir a WebP
    const webpBuffer = await sharpInstance
      .webp({ quality: 85 })
      .toBuffer();
    
    // Configurar cabeceras para caché agresiva
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', 'image/webp');
    
    // Enviar la imagen procesada
    res.status(200).send(webpBuffer);
    
  } catch (error) {
    console.error('Error optimizing image:', error.message);
    res.status(500).json({ 
      error: 'Error processing image',
      message: error.message
    });
  }
};