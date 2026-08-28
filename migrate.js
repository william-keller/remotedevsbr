const fs = require('fs');
const path = require('path');

const OLD_SRC = path.join(__dirname, '../remotedevs-br/src');
const NEW_APP = path.join(__dirname, 'app');

const routeMap = {
  'Index.tsx': '',
  'NotFound.tsx': '[...not-found]',
  'PrivacyPolicy.tsx': 'privacy-policy',
  'Terms.tsx': 'terms',
  'Auth.tsx': 'auth',
  'ResetPassword.tsx': 'reset-password',
  'UpdatePassword.tsx': 'update-password',
  'Dashboard.tsx': 'dashboard',
  'Profile.tsx': 'profile',
  'Pro.tsx': 'pro',
  'Journey.tsx': 'journey',
  'Classes.tsx': 'classes',
  'Resources.tsx': 'resources',
  'Help.tsx': 'help',
  'English.tsx': 'english',
  'Jobs.tsx': 'jobs',
  'Applications.tsx': 'applications',
  'Companies.tsx': 'companies',
  'Projects.tsx': 'projects',
  'Tools.tsx': 'tools',
  'SalaryCalc.tsx': 'tools/salary',
  'ResumeBuilder.tsx': 'tools/resume',
  'LinkedinTuner.tsx': 'tools/linkedin',
  'Admin.tsx': 'admin',
  'AdminCandidates.tsx': 'admin/candidates',
  'Onboarding.tsx': 'onboarding',
  'AnalyzeResume.tsx': 'analyze',
  'EnglishCheck.tsx': 'english-check',
  'Achievements.tsx': 'achievements',
  'RecruiterAuth.tsx': 'recruiter/auth',
  'RecruiterDashboard.tsx': 'recruiter/dashboard',
  'RecruiterSearch.tsx': 'recruiter/search',
  'RecruiterCandidateView.tsx': 'recruiter/candidate',
  'RecruiterPricing.tsx': 'recruiter/pricing',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add "use client" if it's a page or uses hooks, but for simplicity let's just add it to all TSX files
  // since they are mostly client components anyway.
  if (filePath.endsWith('.tsx') && !content.includes('"use client"') && !content.includes("'use client'")) {
    content = '"use client";\n\n' + content;
  }

  // Replace react-router-dom imports
  content = content.replace(/import\s+{([^}]*)}\s+from\s+['"]react-router-dom['"];?/g, (match, p1) => {
    let imports = p1.split(',').map(s => s.trim());
    let nextImports = [];
    let nextLink = false;
    let newStr = '';

    if (imports.includes('Link')) {
      newStr += 'import Link from "next/link";\n';
      imports = imports.filter(i => i !== 'Link');
    }

    if (imports.includes('useNavigate')) {
      nextImports.push('useRouter');
      imports = imports.filter(i => i !== 'useNavigate');
      content = content.replace(/useNavigate\(\)/g, 'useRouter()');
      content = content.replace(/const navigate = /g, 'const router = ');
      content = content.replace(/navigate\(/g, 'router.push(');
    }
    
    if (imports.includes('useLocation')) {
      nextImports.push('usePathname');
      imports = imports.filter(i => i !== 'useLocation');
      content = content.replace(/useLocation\(\)/g, 'usePathname()');
      content = content.replace(/const location = /g, 'const pathname = ');
      content = content.replace(/location\.pathname/g, 'pathname');
    }

    if (imports.includes('useParams')) {
      nextImports.push('useParams');
      imports = imports.filter(i => i !== 'useParams');
    }
    
    if (imports.includes('useSearchParams')) {
      nextImports.push('useSearchParams');
      imports = imports.filter(i => i !== 'useSearchParams');
    }

    if (nextImports.length > 0) {
      newStr += `import { ${nextImports.join(', ')} } from "next/navigation";\n`;
    }

    return newStr;
  });

  // Fix react-helmet-async (Next.js handles SEO via Metadata, but since we are wrapping in "use client", 
  // it's easier to just remove it or change to a null operation for now).
  // Next.js requires title in metadata for server pages, but client pages can use standard title.
  content = content.replace(/import\s+{?\s*Helmet\s*}?\s+from\s+['"]react-helmet-async['"];?/g, '');
  content = content.replace(/<Helmet>\s*<title>([^<]+)<\/title>\s*<\/Helmet>/g, (match, title) => {
    return `<title>${title}</title>`;
  });
  content = content.replace(/<Helmet>[\s\S]*?<\/Helmet>/g, ''); // strip remaining

  return content;
}

// 1. Migrate pages
for (const [file, route] of Object.entries(routeMap)) {
  const sourcePath = path.join(OLD_SRC, 'pages', file);
  if (!fs.existsSync(sourcePath)) {
    console.log('Not found:', sourcePath);
    continue;
  }

  const destDir = path.join(NEW_APP, route);
  fs.mkdirSync(destDir, { recursive: true });

  const destPath = path.join(destDir, 'page.tsx');
  
  let content = processFile(sourcePath);

  // Next.js pages must have a default export. Most of these already do.
  fs.writeFileSync(destPath, content);
}

// 2. Process all components and hooks recursively for react-router-dom replacements
function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = processFile(fullPath);
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.join(__dirname, 'components'));
processDir(path.join(__dirname, 'hooks'));
processDir(path.join(__dirname, 'lib'));

console.log("Migration complete");
