/**
 * Project detection utilities
 */

import fs from 'fs-extra';
import path from 'path';

export interface ProjectInfo {
  language?: string;
  framework?: string;
  packageManager?: string;
}

export async function detectProject(dir: string): Promise<ProjectInfo> {
  const info: ProjectInfo = {};

  // Check for package.json (Node.js)
  const packageJsonPath = path.join(dir, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);

    // Detect language
    if (packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript) {
      info.language = 'TypeScript';
    } else {
      info.language = 'JavaScript';
    }

    // Detect framework
    if (packageJson.dependencies?.react) {
      info.framework = 'React';
    } else if (packageJson.dependencies?.express) {
      info.framework = 'Express.js';
    } else if (packageJson.dependencies?.next) {
      info.framework = 'Next.js';
    }

    // Detect package manager
    if (await fs.pathExists(path.join(dir, 'pnpm-lock.yaml'))) {
      info.packageManager = 'pnpm';
    } else if (await fs.pathExists(path.join(dir, 'yarn.lock'))) {
      info.packageManager = 'yarn';
    } else if (await fs.pathExists(path.join(dir, 'package-lock.json'))) {
      info.packageManager = 'npm';
    }
  }

  // Check for requirements.txt (Python)
  const requirementsPath = path.join(dir, 'requirements.txt');
  if (await fs.pathExists(requirementsPath)) {
    info.language = 'Python';

    const requirements = await fs.readFile(requirementsPath, 'utf-8');
    if (requirements.includes('django')) {
      info.framework = 'Django';
    } else if (requirements.includes('flask')) {
      info.framework = 'Flask';
    }

    info.packageManager = 'pip';
  }

  // Check for go.mod (Go)
  const goModPath = path.join(dir, 'go.mod');
  if (await fs.pathExists(goModPath)) {
    info.language = 'Go';
    info.packageManager = 'go mod';
  }

  // Check for Cargo.toml (Rust)
  const cargoPath = path.join(dir, 'Cargo.toml');
  if (await fs.pathExists(cargoPath)) {
    info.language = 'Rust';
    info.packageManager = 'cargo';
  }

  return info;
}
