import { Router } from 'express';
import multer from 'multer';
import { ProjectController } from '../controllers/ProjectController';
import { BaselineController } from '../controllers/BaselineController';
import { HealthController } from '../controllers/HealthController';
import { TestController } from '../controllers/TestController';
import { PixelDiffController } from '../controllers/PixelDiffController';
import { UtilityController } from '../controllers/UtilityController';
import { MongoProjectRepository } from '../../infrastructure/persistence/MongoProjectRepository';
import { MongoBaselineRepository } from '../../infrastructure/persistence/MongoBaselineRepository';
import { MongoTestRunRepository } from '../../infrastructure/persistence/MongoTestRunRepository';
import { MongoTestResultRepository } from '../../infrastructure/persistence/MongoTestResultRepository';
import { PlaywrightService } from '../../infrastructure/browser/PlaywrightService';
import { PixelDiffService } from '../../infrastructure/diff/PixelDiffService';
import { OpenAIDiffService } from '../../infrastructure/diff/OpenAIDiffService';
import { GroqDiffService } from '../../infrastructure/diff/GroqDiffService';
import { OpenAIRouterDiffService } from '../../infrastructure/diff/OpenAIRouterDiffService';
import { HybridDiffEngine } from '../../infrastructure/diff/HybridDiffEngine';
import { FileStorageService } from '../../infrastructure/storage/FileStorageService';
import { TestExecutionService } from '../../application/execution/TestExecutionService';
import { ConcurrentExecutionManager } from '../../application/execution/ConcurrentExecutionManager';
import { SimpleExplanationService } from '../../infrastructure/explanation/SimpleExplanationService';
import { validateRequest } from '../../core/middlewares/errorHandler';
import { CreateProjectDto, UpdateProjectDto, CreateBaselineDto } from '../dtos';
import { RunTestDto } from '../dtos/testDtos';
import { PixelDiffDto } from '../dtos/pixelDtos';

const router = Router();

// Initialize repositories
const projectRepository = new MongoProjectRepository();
const baselineRepository = new MongoBaselineRepository();
const testRunRepository = new MongoTestRunRepository();
const testResultRepository = new MongoTestResultRepository();

// Initialize storage service
const fileStorageService = new FileStorageService();
fileStorageService.initialize(); // Initialize directories

// Initialize diff services
const pixelDiffService = new PixelDiffService();
const openAIDiffService = new OpenAIDiffService();
const groqDiffService = new GroqDiffService();
const openaiRouterDiffService = new OpenAIRouterDiffService();
const explanationService = new SimpleExplanationService();
const hybridDiffEngine = new HybridDiffEngine(pixelDiffService, openAIDiffService, groqDiffService, openaiRouterDiffService, explanationService);

// Initialize other services
const playwrightService = new PlaywrightService();
const testExecutionService = new TestExecutionService(
  playwrightService,
  hybridDiffEngine,
  baselineRepository,
  testResultRepository,
  fileStorageService
);
const executionManager = new ConcurrentExecutionManager(
  testRunRepository,
  (testRun) => testExecutionService.executeTest(testRun)
);

// Initialize controllers
const projectController = new ProjectController(projectRepository);
const baselineController = new BaselineController(baselineRepository, projectRepository, fileStorageService);
const testController = new TestController(testRunRepository, projectRepository, baselineRepository, executionManager);
const pixelDiffController = new PixelDiffController(pixelDiffService, baselineRepository, projectRepository, fileStorageService, playwrightService);
const utilityController = new UtilityController();
const healthController = new HealthController();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Health check
router.get('/health', healthController.check.bind(healthController));

// Project routes
router.post('/projects', validateRequest(CreateProjectDto), projectController.create.bind(projectController));
router.get('/projects', projectController.getAll.bind(projectController));
router.get('/projects/:id', projectController.getById.bind(projectController));
router.put('/projects/:id', validateRequest(UpdateProjectDto), projectController.update.bind(projectController));
router.delete('/projects/:id', projectController.delete.bind(projectController));

// Baseline routes
router.post('/baselines', upload.single('image'), baselineController.create.bind(baselineController));
router.get('/projects/:projectId/baselines', baselineController.getByProject.bind(baselineController));
router.get('/baselines/:id', baselineController.getById.bind(baselineController));
router.delete('/baselines/:id', baselineController.delete.bind(baselineController));

// Test execution routes (hybrid AI + pixel)
router.post('/tests/run', validateRequest(RunTestDto), testController.runTest.bind(testController));
router.get('/tests/:id', testController.getTestStatus.bind(testController));
router.get('/queue/status', testController.getQueueStatus.bind(testController));

// Pixel-only diff routes
router.post('/pixel/compare', validateRequest(PixelDiffDto), pixelDiffController.compare.bind(pixelDiffController));
router.post('/pixel/quick-compare', pixelDiffController.quickCompare.bind(pixelDiffController));

// Utility routes
router.post('/utils/image-to-base64', upload.single('image'), utilityController.convertImageToBase64.bind(utilityController));

export { router as apiRoutes };