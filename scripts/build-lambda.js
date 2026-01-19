// scripts/build-lambda.js - Bundle Lambda handler with esbuild
import * as esbuild from 'esbuild';
import { mkdirSync, cpSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist-lambda');

// Clean and create dist directory
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });

console.log('Bundling Lambda handler with esbuild...');

await esbuild.build({
  entryPoints: [join(projectRoot, 'server/lambda.js')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: join(distDir, 'lambda.js'),
  external: ['@prisma/client'],
  minify: true,
  sourcemap: false,
});

console.log('Bundle created: dist-lambda/lambda.js');

// Copy Prisma files
console.log('Copying Prisma client...');
const prismaClientDir = join(projectRoot, 'node_modules/@prisma/client');
const prismaDotDir = join(projectRoot, 'node_modules/.prisma');
const prismaSchemaDir = join(projectRoot, 'prisma');

cpSync(prismaClientDir, join(distDir, 'node_modules/@prisma/client'), { recursive: true });
cpSync(prismaDotDir, join(distDir, 'node_modules/.prisma'), { recursive: true });
cpSync(prismaSchemaDir, join(distDir, 'prisma'), { recursive: true });

// Create a minimal package.json (CommonJS - no type: module)
const packageJson = {
  name: 'pokeshop-lambda',
  version: '1.0.0'
};

import { writeFileSync } from 'fs';
writeFileSync(join(distDir, 'package.json'), JSON.stringify(packageJson, null, 2));

console.log('Lambda build complete!');
