import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const execFileAsync = promisify(execFile);
const BASE_PATH = '/academic-trend-monitor/';
const SEMANTIC_SEARCH_ENDPOINT = '/__openalex-semantic-search';
const PAPER_EMBEDDINGS_ENDPOINT = '/__openalex-paper-embeddings-pilot';
const FULL_PAPER_EMBEDDINGS_ENDPOINT = '/__openalex-full-paper-embeddings-baseline';
const FULL_PAPER_IMPACT_SHELL_ENDPOINT = '/__openalex-full-paper-impact-shell';
const FULL_PAPER_FIELD_HEAT_GLOBE_ENDPOINT = '/__openalex-full-paper-field-heat-globe';
const FULL_PAPER_TOPIC_STRUCTURE_ENDPOINT = '/__openalex-full-paper-topic-structure';
const FULL_PAPER_TOPIC_PEAK_GLOBE_ENDPOINT = '/__openalex-full-paper-topic-peak-globe';
const FULL_PAPER_LIGHT_PAPER_CLOUD_ENDPOINT = '/__openalex-full-paper-light-paper-cloud';
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const semanticSearchScriptPath = fileURLToPath(new URL('../pipeline/openalex_semantic_search_sidecar.py', import.meta.url));
const defaultPaperEmbeddingsBundlePath = fileURLToPath(new URL('../data/output/openalex_topic_paper_embeddings/openalex_topic_paper_embeddings_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/t10243-statistical-methods-and-bayesian-inference/paper_embeddings_bundle.json', import.meta.url));
const defaultFullPaperEmbeddingsBundlePath = fileURLToPath(new URL('../data/output/openalex_full_paper_title_embeddings/openalex_full_paper_title_embeddings_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/paper_embeddings_bundle.json', import.meta.url));
const defaultFullPaperImpactShellBundlePath = fileURLToPath(new URL('../data/output/openalex_full_paper_impact_shell/openalex_full_paper_impact_shell_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/impact_shell_bundle.json', import.meta.url));
const defaultFieldHeatGlobeBundlePath = fileURLToPath(new URL('../data/output/openalex_full_paper_field_heat_globe/openalex_full_paper_field_heat_globe_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/field_heat_globe_bundle.json', import.meta.url));
const defaultTopicStructureBundlePath = fileURLToPath(new URL('../data/output/openalex_full_paper_topic_structure/openalex_full_paper_topic_structure_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/topic_structure_bundle.json', import.meta.url));
const defaultTopicPeakGlobeBundlePath = fileURLToPath(new URL('../data/output/openalex_full_paper_topic_peak_globe/openalex_full_paper_topic_peak_globe_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/topic_peak_globe_bundle.json', import.meta.url));
const defaultLightPaperCloudBundlePath = fileURLToPath(new URL('../data/output/openalex_full_paper_light_paper_cloud/openalex_full_paper_light_paper_cloud_v1/works_2025_math_primary_topic/2026-03-23-math-primary-topic-full/light_paper_cloud_bundle.json', import.meta.url));

function clampPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function jsonResponse(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function unavailableResponse(reason, message) {
  return {
    available: false,
    message,
    reason,
  };
}

function matchesBasePathEndpoint(requestUrl, endpointPath) {
  const url = new URL(requestUrl || '/', 'http://127.0.0.1');
  const pathname = url.pathname;
  const normalizedBasePath = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH;

  return pathname === endpointPath || pathname === `${normalizedBasePath}${endpointPath}`;
}

function matchesSemanticSearchPath(requestUrl) {
  return matchesBasePathEndpoint(requestUrl, SEMANTIC_SEARCH_ENDPOINT);
}

function matchesPaperEmbeddingsPath(requestUrl) {
  return matchesBasePathEndpoint(requestUrl, PAPER_EMBEDDINGS_ENDPOINT);
}

function matchesFullPaperEmbeddingsPath(requestUrl) {
  return matchesBasePathEndpoint(requestUrl, FULL_PAPER_EMBEDDINGS_ENDPOINT);
}

function matchesFullPaperImpactShellPath(requestUrl) {
  return matchesBasePathEndpoint(requestUrl, FULL_PAPER_IMPACT_SHELL_ENDPOINT);
}

function matchesFullPaperFieldHeatGlobePath(requestUrl) {
  return matchesBasePathEndpoint(requestUrl, FULL_PAPER_FIELD_HEAT_GLOBE_ENDPOINT);
}

function matchesFullPaperTopicStructurePath(requestUrl) {
  return matchesBasePathEndpoint(requestUrl, FULL_PAPER_TOPIC_STRUCTURE_ENDPOINT);
}

function matchesFullPaperTopicPeakGlobePath(requestUrl) {
  return matchesBasePathEndpoint(requestUrl, FULL_PAPER_TOPIC_PEAK_GLOBE_ENDPOINT);
}

function matchesFullPaperLightPaperCloudPath(requestUrl) {
  return matchesBasePathEndpoint(requestUrl, FULL_PAPER_LIGHT_PAPER_CLOUD_ENDPOINT);
}

function createOpenAlexTopicPaperEmbeddingsBridge(env) {
  return {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!matchesPaperEmbeddingsPath(req.url)) {
          next();
          return;
        }

        if (req.method !== 'GET') {
          jsonResponse(res, 405, {
            error: 'Method not allowed',
          });
          return;
        }

        const bundlePath = String(
          env.OPENALEX_TOPIC_PAPER_EMBEDDINGS_BUNDLE_PATH || defaultPaperEmbeddingsBundlePath,
        ).trim();

        if (!bundlePath) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_paper_bundle_path',
              'Paper embeddings pilot bundle path is not configured for local Vite serve mode.',
            ),
          );
          return;
        }

        if (!fs.existsSync(bundlePath)) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_paper_bundle_file',
              `Configured paper embeddings pilot bundle was not found at ${bundlePath}.`,
            ),
          );
          return;
        }

        try {
          const payload = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
          jsonResponse(res, 200, payload);
        } catch (error) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'paper_bundle_read_failed',
              String(error?.message || 'Paper embeddings pilot bundle could not be read.'),
            ),
          );
        }
      });
    },
    name: 'openalex-topic-paper-embeddings-bridge',
  };
}

function createOpenAlexFullPaperEmbeddingsBridge(env) {
  return {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!matchesFullPaperEmbeddingsPath(req.url)) {
          next();
          return;
        }

        if (req.method !== 'GET') {
          jsonResponse(res, 405, {
            error: 'Method not allowed',
          });
          return;
        }

        const bundlePath = String(
          env.OPENALEX_FULL_PAPER_EMBEDDINGS_BUNDLE_PATH || defaultFullPaperEmbeddingsBundlePath,
        ).trim();

        if (!bundlePath) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_bundle_path',
              'Full-paper title-only baseline bundle path is not configured for local Vite serve mode.',
            ),
          );
          return;
        }

        if (!fs.existsSync(bundlePath)) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_bundle_file',
              `Configured full-paper title-only baseline bundle was not found at ${bundlePath}.`,
            ),
          );
          return;
        }

        try {
          const payload = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
          jsonResponse(res, 200, payload);
        } catch (error) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'full_paper_bundle_read_failed',
              String(error?.message || 'Full-paper title-only baseline bundle could not be read.'),
            ),
          );
        }
      });
    },
    name: 'openalex-full-paper-embeddings-bridge',
  };
}

function createOpenAlexFullPaperImpactShellBridge(env) {
  return {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!matchesFullPaperImpactShellPath(req.url)) {
          next();
          return;
        }

        if (req.method !== 'GET') {
          jsonResponse(res, 405, {
            error: 'Method not allowed',
          });
          return;
        }

        const bundlePath = String(
          env.OPENALEX_FULL_PAPER_IMPACT_SHELL_BUNDLE_PATH || defaultFullPaperImpactShellBundlePath,
        ).trim();

        if (!bundlePath) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_impact_shell_bundle_path',
              'Full-paper impact shell bundle path is not configured for local Vite serve mode.',
            ),
          );
          return;
        }

        if (!fs.existsSync(bundlePath)) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_impact_shell_bundle_file',
              `Configured full-paper impact shell bundle was not found at ${bundlePath}.`,
            ),
          );
          return;
        }

        try {
          const payload = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
          jsonResponse(res, 200, payload);
        } catch (error) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'full_paper_impact_shell_bundle_read_failed',
              String(error?.message || 'Full-paper impact shell bundle could not be read.'),
            ),
          );
        }
      });
    },
    name: 'openalex-full-paper-impact-shell-bridge',
  };
}

function createOpenAlexFullPaperFieldHeatGlobeBridge(env) {
  return {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!matchesFullPaperFieldHeatGlobePath(req.url)) {
          next();
          return;
        }

        if (req.method !== 'GET') {
          jsonResponse(res, 405, {
            error: 'Method not allowed',
          });
          return;
        }

        const bundlePath = String(
          env.OPENALEX_FULL_PAPER_FIELD_HEAT_GLOBE_BUNDLE_PATH || defaultFieldHeatGlobeBundlePath,
        ).trim();

        if (!bundlePath) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_field_heat_globe_bundle_path',
              'Full-paper field heat globe bundle path is not configured for local Vite serve mode.',
            ),
          );
          return;
        }

        if (!fs.existsSync(bundlePath)) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_field_heat_globe_bundle_file',
              `Configured full-paper field heat globe bundle was not found at ${bundlePath}.`,
            ),
          );
          return;
        }

        try {
          const payload = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
          jsonResponse(res, 200, payload);
        } catch (error) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'full_paper_field_heat_globe_bundle_read_failed',
              String(error?.message || 'Full-paper field heat globe bundle could not be read.'),
            ),
          );
        }
      });
    },
    name: 'openalex-full-paper-field-heat-globe-bridge',
  };
}

function createOpenAlexFullPaperTopicStructureBridge(env) {
  return {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!matchesFullPaperTopicStructurePath(req.url)) {
          next();
          return;
        }

        if (req.method !== 'GET') {
          jsonResponse(res, 405, {
            error: 'Method not allowed',
          });
          return;
        }

        const bundlePath = String(
          env.OPENALEX_FULL_PAPER_TOPIC_STRUCTURE_BUNDLE_PATH || defaultTopicStructureBundlePath,
        ).trim();

        if (!bundlePath) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_topic_structure_bundle_path',
              'Full-paper topic structure bundle path is not configured for local Vite serve mode.',
            ),
          );
          return;
        }

        if (!fs.existsSync(bundlePath)) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_topic_structure_bundle_file',
              `Configured full-paper topic structure bundle was not found at ${bundlePath}.`,
            ),
          );
          return;
        }

        try {
          const payload = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
          jsonResponse(res, 200, payload);
        } catch (error) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'full_paper_topic_structure_bundle_read_failed',
              String(error?.message || 'Full-paper topic structure bundle could not be read.'),
            ),
          );
        }
      });
    },
    name: 'openalex-full-paper-topic-structure-bridge',
  };
}

function createOpenAlexFullPaperTopicPeakGlobeBridge(env) {
  return {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!matchesFullPaperTopicPeakGlobePath(req.url)) {
          next();
          return;
        }

        if (req.method !== 'GET') {
          jsonResponse(res, 405, {
            error: 'Method not allowed',
          });
          return;
        }

        const bundlePath = String(
          env.OPENALEX_FULL_PAPER_TOPIC_PEAK_GLOBE_BUNDLE_PATH || defaultTopicPeakGlobeBundlePath,
        ).trim();

        if (!bundlePath) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_topic_peak_globe_bundle_path',
              'Full-paper topic peak globe bundle path is not configured for local Vite serve mode.',
            ),
          );
          return;
        }

        if (!fs.existsSync(bundlePath)) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_topic_peak_globe_bundle_file',
              `Configured full-paper topic peak globe bundle was not found at ${bundlePath}.`,
            ),
          );
          return;
        }

        try {
          const payload = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
          jsonResponse(res, 200, payload);
        } catch (error) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'full_paper_topic_peak_globe_bundle_read_failed',
              String(error?.message || 'Full-paper topic peak globe bundle could not be read.'),
            ),
          );
        }
      });
    },
    name: 'openalex-full-paper-topic-peak-globe-bridge',
  };
}

function createOpenAlexFullPaperLightPaperCloudBridge(env) {
  return {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!matchesFullPaperLightPaperCloudPath(req.url)) {
          next();
          return;
        }

        if (req.method !== 'GET') {
          jsonResponse(res, 405, {
            error: 'Method not allowed',
          });
          return;
        }

        const bundlePath = String(
          env.OPENALEX_FULL_PAPER_LIGHT_PAPER_CLOUD_BUNDLE_PATH || defaultLightPaperCloudBundlePath,
        ).trim();

        if (!bundlePath) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_light_paper_cloud_bundle_path',
              'Full-paper light paper cloud bundle path is not configured for local Vite serve mode.',
            ),
          );
          return;
        }

        if (!fs.existsSync(bundlePath)) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_full_paper_light_paper_cloud_bundle_file',
              `Configured full-paper light paper cloud bundle was not found at ${bundlePath}.`,
            ),
          );
          return;
        }

        try {
          const payload = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
          jsonResponse(res, 200, payload);
        } catch (error) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'full_paper_light_paper_cloud_bundle_read_failed',
              String(error?.message || 'Full-paper light paper cloud bundle could not be read.'),
            ),
          );
        }
      });
    },
    name: 'openalex-full-paper-light-paper-cloud-bridge',
  };
}

function createOpenAlexSemanticSearchBridge(env) {
  return {
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!matchesSemanticSearchPath(req.url)) {
          next();
          return;
        }

        if (req.method !== 'GET') {
          jsonResponse(res, 405, {
            error: 'Method not allowed',
          });
          return;
        }

        const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
        const queryText = String(requestUrl.searchParams.get('query') || '').trim();
        const topK = clampPositiveInt(
          requestUrl.searchParams.get('limit') || env.OPENALEX_SEMANTIC_SEARCH_TOP_K,
          12,
        );

        if (!queryText) {
          jsonResponse(res, 400, {
            error: 'Missing non-empty query parameter',
          });
          return;
        }

        const sidecarPath = String(env.OPENALEX_SEMANTIC_SEARCH_SIDECAR_PATH || '').trim();
        if (!sidecarPath) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_sidecar_path',
              'Semantic search sidecar path is not configured for local Vite serve mode. Lexical Top Matches remain the baseline.',
            ),
          );
          return;
        }

        if (!fs.existsSync(sidecarPath)) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_sidecar_file',
              `Configured semantic search sidecar was not found at ${sidecarPath}. Lexical Top Matches remain the baseline.`,
            ),
          );
          return;
        }

        if (!fs.existsSync(semanticSearchScriptPath)) {
          jsonResponse(
            res,
            200,
            unavailableResponse(
              'missing_sidecar_script',
              'Semantic search bridge could not find pipeline/openalex_semantic_search_sidecar.py. Lexical Top Matches remain the baseline.',
            ),
          );
          return;
        }

        const pythonBinary = String(env.OPENALEX_SEMANTIC_SEARCH_PYTHON_BIN || 'python3').trim() || 'python3';
        const timeoutMs = clampPositiveInt(env.OPENALEX_SEMANTIC_SEARCH_TIMEOUT_MS, 20000);
        const args = [
          semanticSearchScriptPath,
          'query',
          '--sidecar-path',
          sidecarPath,
          '--query-text',
          queryText,
          '--top-k',
          String(topK),
        ];
        const encoderModel = String(env.OPENALEX_SEMANTIC_SEARCH_ENCODER_MODEL || '').trim();
        if (encoderModel) {
          args.push('--encoder-model', encoderModel);
        }

        try {
          const { stdout } = await execFileAsync(
            pythonBinary,
            args,
            {
              cwd: repoRoot,
              maxBuffer: 1024 * 1024 * 8,
              timeout: timeoutMs,
            },
          );
          const payload = JSON.parse(stdout);

          jsonResponse(res, 200, {
            available: true,
            encoder_name: payload.encoder_name,
            matches: payload.matches,
            query_text: payload.query_text,
            top_k: payload.top_k,
          });
        } catch (error) {
          const stderr = String(error?.stderr || '').trim();
          const bridgeMessage = stderr || String(error?.message || 'Semantic assist runtime failed.');

          jsonResponse(
            res,
            200,
            unavailableResponse(
              'semantic_runtime_unavailable',
              `${bridgeMessage} Lexical Top Matches remain the baseline.`,
            ),
          );
        }
      });
    },
    name: 'openalex-semantic-search-bridge',
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      command === 'serve' ? createOpenAlexTopicPaperEmbeddingsBridge(env) : null,
      command === 'serve' ? createOpenAlexFullPaperEmbeddingsBridge(env) : null,
      command === 'serve' ? createOpenAlexFullPaperImpactShellBridge(env) : null,
      command === 'serve' ? createOpenAlexFullPaperFieldHeatGlobeBridge(env) : null,
      command === 'serve' ? createOpenAlexFullPaperTopicStructureBridge(env) : null,
      command === 'serve' ? createOpenAlexFullPaperTopicPeakGlobeBridge(env) : null,
      command === 'serve' ? createOpenAlexFullPaperLightPaperCloudBridge(env) : null,
      command === 'serve' ? createOpenAlexSemanticSearchBridge(env) : null,
    ].filter(Boolean),
    base: BASE_PATH,
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
});
