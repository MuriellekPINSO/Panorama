/**
 * Tests du serveur Teleport 360° Panorama
 * 
 * Exécuter avec: npm test
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================

const API_URL = 'http://localhost:3000';
const TEST_IMAGES_DIR = path.join(__dirname, 'test-images');

// ============================================
// UTILITAIRES
// ============================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const printSection = (title) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}\n`);
};

const printSuccess = (message) => console.log(`✅ ${message}`);
const printError = (message) => console.log(`❌ ${message}`);
const printInfo = (message) => console.log(`ℹ️  ${message}`);

// ============================================
// TESTS
// ============================================

class TeleportTests {
  constructor() {
    this.results = [];
  }

  async testHealthCheck() {
    printSection('Test 1: Health Check');
    
    try {
      const response = await axios.get(`${API_URL}/api/health`);
      
      printSuccess('Server is running');
      printInfo(`Version: ${response.data.version}`);
      printInfo(`Service: ${response.data.service}`);
      printInfo(`Python/OpenCV available: ${response.data.capabilities.pythonOpenCV}`);
      printInfo(`Formats supported: ${Object.keys(response.data.formats).join(', ')}`);
      
      this.results.push({ test: 'Health Check', status: 'PASS' });
      return true;
    } catch (error) {
      printError(`Health check failed: ${error.message}`);
      this.results.push({ test: 'Health Check', status: 'FAIL' });
      return false;
    }
  }

  async testWithMockImages() {
    printSection('Test 2: Panorama Creation (Mock Images)');
    
    try {
      // Créer les images de test
      await this.createMockImages();
      
      const form = new FormData();
      
      // Ajouter les images
      const imagePaths = [
        path.join(TEST_IMAGES_DIR, 'image1.jpg'),
        path.join(TEST_IMAGES_DIR, 'image2.jpg'),
        path.join(TEST_IMAGES_DIR, 'image3.jpg'),
      ];

      for (const imagePath of imagePaths) {
        form.append('photos', fs.createReadStream(imagePath), path.basename(imagePath));
      }

      // Ajouter métadonnées
      form.append('metadata', JSON.stringify({
        gps: {
          lat: 48.8566,
          lon: 2.3522,
          alt: 35
        },
        location_name: 'Eiffel Tower, Paris',
        orientation: 'north'
      }));

      printInfo('Uploading 3 test images...');
      
      const response = await axios.post(
        `${API_URL}/api/stitch-panorama`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 300000,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            process.stdout.write(`\rProgress: ${percentCompleted}%`);
          }
        }
      );

      console.log('\n');
      
      if (response.data.success) {
        printSuccess('Panorama created successfully');
        printInfo(`Panorama ID: ${response.data.panoramaId}`);
        printInfo(`Format: ${response.data.format}`);
        printInfo(`Resolution: ${response.data.resolution}`);
        printInfo(`File size: ${(response.data.fileSize / 1024 / 1024).toFixed(2)} MB`);
        printInfo(`Location: ${response.data.location}`);
        
        this.panoramaId = response.data.panoramaId;
        this.results.push({ test: 'Panorama Creation', status: 'PASS' });
        return true;
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      printError(`Panorama creation failed: ${error.message}`);
      this.results.push({ test: 'Panorama Creation', status: 'FAIL' });
      return false;
    }
  }

  async testMetadataRetrieval() {
    printSection('Test 3: Metadata Retrieval');
    
    if (!this.panoramaId) {
      printError('No panorama ID from previous test');
      this.results.push({ test: 'Metadata Retrieval', status: 'SKIP' });
      return false;
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/panorama/${this.panoramaId}/metadata`
      );

      printSuccess('Metadata retrieved successfully');
      printInfo(`Created at: ${response.data.createdAt}`);
      printInfo(`GPS: ${response.data.gps.lat}°, ${response.data.gps.lon}°`);
      printInfo(`Altitude: ${response.data.gps.alt}m`);
      printInfo(`Location: ${response.data.locationName}`);
      
      this.results.push({ test: 'Metadata Retrieval', status: 'PASS' });
      return true;
    } catch (error) {
      printError(`Metadata retrieval failed: ${error.message}`);
      this.results.push({ test: 'Metadata Retrieval', status: 'FAIL' });
      return false;
    }
  }

  async testImageDownload() {
    printSection('Test 4: Image Download');
    
    if (!this.panoramaId) {
      printError('No panorama ID from previous test');
      this.results.push({ test: 'Image Download', status: 'SKIP' });
      return false;
    }

    try {
      const response = await axios.get(
        `${API_URL}/panoramas/${this.panoramaId}.jpg`,
        { responseType: 'stream' }
      );

      printSuccess('Image downloaded successfully');
      printInfo(`Content-Type: ${response.headers['content-type']}`);
      printInfo(`Content-Length: ${(response.headers['content-length'] / 1024 / 1024).toFixed(2)} MB`);
      
      this.results.push({ test: 'Image Download', status: 'PASS' });
      return true;
    } catch (error) {
      printError(`Image download failed: ${error.message}`);
      this.results.push({ test: 'Image Download', status: 'FAIL' });
      return false;
    }
  }

  async testOptimizedFormats() {
    printSection('Test 5: Optimized Formats');
    
    if (!this.panoramaId) {
      printError('No panorama ID from previous test');
      this.results.push({ test: 'Optimized Formats', status: 'SKIP' });
      return false;
    }

    const formats = ['streamingHD', 'thumbnail'];
    let allSuccess = true;

    for (const format of formats) {
      try {
        const response = await axios.get(
          `${API_URL}/api/panorama/${this.panoramaId}/${format}`,
          { responseType: 'stream' }
        );

        printSuccess(`${format} format downloaded`);
        printInfo(`  Size: ${(response.headers['content-length'] / 1024).toFixed(1)} KB`);
      } catch (error) {
        printError(`${format} format failed: ${error.message}`);
        allSuccess = false;
      }
    }

    this.results.push({
      test: 'Optimized Formats',
      status: allSuccess ? 'PASS' : 'PARTIAL'
    });

    return allSuccess;
  }

  async createMockImages() {
    // Créer le dossier de test
    if (!fs.existsSync(TEST_IMAGES_DIR)) {
      fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });
    }

    // Créer 3 images JPEG simples (100x100 pixels)
    const createDummyImage = async (filename) => {
      const canvas = require('canvas').createCanvas(400, 300);
      const ctx = canvas.getContext('2d');
      
      // Fond blanc
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 400, 300);
      
      // Texte
      ctx.fillStyle = '#000000';
      ctx.font = '20px Arial';
      ctx.fillText(filename, 150, 150);
      
      // Sauvegarder
      const out = fs.createWriteStream(path.join(TEST_IMAGES_DIR, filename));
      canvas.createJPEGStream().pipe(out);
      
      return new Promise((resolve) => {
        out.on('finish', resolve);
      });
    };

    printInfo('Creating test images...');
    
    try {
      // Vérifier si les images existent déjà
      if (!fs.existsSync(path.join(TEST_IMAGES_DIR, 'image1.jpg'))) {
        // Créer des images JPEG simples
        const images = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
        for (const image of images) {
          const imagePath = path.join(TEST_IMAGES_DIR, image);
          if (!fs.existsSync(imagePath)) {
            // Créer une image JPEG minimal
            const buffer = Buffer.alloc(1000);
            fs.writeFileSync(imagePath, buffer);
          }
        }
      }
      printInfo('Test images ready');
    } catch (error) {
      printInfo('Note: Using existing test images');
    }
  }

  printResults() {
    printSection('TEST RESULTS SUMMARY');
    
    console.table(this.results);
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    console.log(`\nTotal: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    
    const percentage = passed / (passed + failed) * 100;
    console.log(`\nSuccess Rate: ${percentage.toFixed(0)}%\n`);
  }
}

// ============================================
// RUN TESTS
// ============================================

async function runTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🧪 TELEPORT 360° SERVER TEST SUITE                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  const tests = new TeleportTests();

  // Test 1: Health check
  await tests.testHealthCheck();
  
  if (!(await tests.testHealthCheck())) {
    printError('Server is not running. Start it with: npm start');
    process.exit(1);
  }

  // Test 2: Panorama creation (requires real images or mock)
  // Uncomment to test with mock images (requires 'canvas' module)
  // await tests.testWithMockImages();
  // await tests.testMetadataRetrieval();
  // await tests.testImageDownload();
  // await tests.testOptimizedFormats();

  tests.printResults();
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { TeleportTests };
