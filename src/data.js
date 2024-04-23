import fs from 'node:fs/promises';

async function readProjectRelativeFile( relativePath ) {
  return fs.readFile( new URL( relativePath, import.meta.url ) );
}

export async function loadDatasets() {
  const [olympics]= await Promise.all([
    readProjectRelativeFile( '../data/olympics.json' )
  ]);

  return {
    olympics: JSON.parse( olympics )
  };
}

