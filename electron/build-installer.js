const electronInstaller = require('electron-winstaller');
const path = require('path');

async function buildInstaller() {
  console.log('Building installer...');
  try {
    await electronInstaller.createWindowsInstaller({
      appDirectory: path.join(__dirname, 'dist', 'Enterprise HRMS-win32-x64'),
      outputDirectory: path.join(__dirname, 'dist', 'installer'),
      authors: 'Enterprise HRMS',
      exe: 'Enterprise HRMS.exe',
      title: 'Enterprise HRMS',
      description: 'Enterprise HRMS Desktop Application',
      setupExe: 'EnterpriseHRMSSteup.exe',
      setupMsi: 'EnterpriseHRMSSteup.msi', // generates MSI as well if needed
      noMsi: false,
      setupIcon: undefined // Add path to icon if you have one
    });
    console.log('Installer successfully created in dist/installer!');
  } catch (e) {
    console.error(`Error creating installer: ${e.message}`);
  }
}

buildInstaller();
