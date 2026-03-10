import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Хелпер для рекурсивного поиска всех .ts/.tsx файлов в директории
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

// Извлекаем все импорты из файла
function getImportsFromFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

describe('FSD Architecture Boundaries', () => {
  const srcPath = path.resolve(__dirname, '../');

  it('shared layer must not import from higher layers', () => {
    const sharedPath = path.join(srcPath, 'shared');
    const files = getAllFiles(sharedPath);
    
    files.forEach(file => {
      const imports = getImportsFromFile(file);
      imports.forEach(imp => {
        // Shared не может импортировать из entities, features, widgets, pages, app
        const hasViolations = 
            imp.includes('@/src/entities') || 
            imp.includes('@/src/features') || 
            imp.includes('@/src/widgets') || 
            imp.includes('@/src/pages') ||
            imp.includes('@/src/app');
            
        expect(hasViolations, `Violation in ${file}: importing ${imp}`).toBe(false);
      });
    });
  });

  it('entities layer must not import from higher layers', () => {
    const entitiesPath = path.join(srcPath, 'entities');
    const files = getAllFiles(entitiesPath);
    
    files.forEach(file => {
      const imports = getImportsFromFile(file);
      imports.forEach(imp => {
        // Entities не может импортировать из features, widgets, pages, app
        const hasViolations = 
            imp.includes('@/src/features') || 
            imp.includes('@/src/widgets') || 
            imp.includes('@/src/pages') ||
            imp.includes('@/src/app');
            
        expect(hasViolations, `Violation in ${file}: importing ${imp}`).toBe(false);
      });
    });
  });

  it('features layer must not import from higher layers', () => {
    const featuresPath = path.join(srcPath, 'features');
    const files = getAllFiles(featuresPath);
    
    files.forEach(file => {
      const imports = getImportsFromFile(file);
      imports.forEach(imp => {
        // Features не может импортировать из widgets, pages, app
        const hasViolations = 
            imp.includes('@/src/widgets') || 
            imp.includes('@/src/pages') ||
            imp.includes('@/src/app');
            
        expect(hasViolations, `Violation in ${file}: importing ${imp}`).toBe(false);
      });
    });
  });
  
  it('cross-imports within entities layer are forbidden (slice isolation)', () => {
    const entitiesPath = path.join(srcPath, 'entities');
    if (!fs.existsSync(entitiesPath)) return;
    
    const slices = fs.readdirSync(entitiesPath).filter(f => fs.statSync(path.join(entitiesPath, f)).isDirectory());
    
    slices.forEach(slice => {
        const slicePath = path.join(entitiesPath, slice);
        const files = getAllFiles(slicePath);
        
        files.forEach(file => {
            const imports = getImportsFromFile(file);
            imports.forEach(imp => {
                const otherSlices = slices.filter(s => s !== slice);
                const importsOtherSlice = otherSlices.some(other => imp.includes(`@/src/entities/${other}`));
                expect(importsOtherSlice, `Cross-slice violation in ${file}: importing ${imp}`).toBe(false);
            });
        })
    });
  });

  it('cross-imports within features layer are forbidden (slice isolation)', () => {
    const featuresPath = path.join(srcPath, 'features');
    if (!fs.existsSync(featuresPath)) return;
    
    const slices = fs.readdirSync(featuresPath).filter(f => fs.statSync(path.join(featuresPath, f)).isDirectory());
    
    slices.forEach(slice => {
        const slicePath = path.join(featuresPath, slice);
        const files = getAllFiles(slicePath);
        
        files.forEach(file => {
            const imports = getImportsFromFile(file);
            imports.forEach(imp => {
                const otherSlices = slices.filter(s => s !== slice);
                const importsOtherSlice = otherSlices.some(other => imp.includes(`@/src/features/${other}`));
                expect(importsOtherSlice, `Cross-slice violation in ${file}: importing ${imp}`).toBe(false);
            });
        })
    });
  });

  it('all FSD modules export through public API (index.ts)', () => {
    const layers = ['entities', 'features'];
    
    layers.forEach(layer => {
      const layerPath = path.join(srcPath, layer);
      if (!fs.existsSync(layerPath)) return;
      
      const slices = fs.readdirSync(layerPath).filter(f => 
        fs.statSync(path.join(layerPath, f)).isDirectory()
      );
      
      slices.forEach(slice => {
        const indexPath = path.join(layerPath, slice, 'index.ts');
        expect(
          fs.existsSync(indexPath),
          `Missing public API: ${layer}/${slice}/index.ts`
        ).toBe(true);
      });
    });
  });
});
