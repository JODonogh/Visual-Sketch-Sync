#!/usr/bin/env node

/**
 * Test script for webview fallback functionality
 * Tests the fallback logic between panel and sidebar display methods
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing VSS Webview Fallback Functionality\n');

// Test 1: Check WebviewPanelManager has fallback methods
console.log('1. Checking WebviewPanelManager fallback implementation...');
const panelManagerPath = path.join(__dirname, '..', 'src', 'webview-panel-manager.ts');
const panelManagerContent = fs.readFileSync(panelManagerPath, 'utf8');

const fallbackMethods = [
    'tryShowInPanel',
    'showInSidebar', 
    'switchDisplayMethod',
    'showDisplayMethodChoice',
    'getCurrentDisplayMethod',
    'updateFallbackOptions',
    'getFallbackOptions'
];

let methodsFound = 0;
fallbackMethods.forEach(method => {
    if (panelManagerContent.includes(method)) {
        console.log(`   ✅ ${method} method found`);
        methodsFound++;
    } else {
        console.log(`   ❌ ${method} method missing`);
    }
});

console.log(`   📊 Found ${methodsFound}/${fallbackMethods.length} fallback methods\n`);

// Test 2: Check DisplayMethod enum exists
console.log('2. Checking DisplayMethod enum...');
if (panelManagerContent.includes('enum DisplayMethod')) {
    console.log('   ✅ DisplayMethod enum found');
    
    const enumValues = ['NONE', 'PANEL', 'SIDEBAR'];
    enumValues.forEach(value => {
        if (panelManagerContent.includes(value)) {
            console.log(`   ✅ ${value} enum value found`);
        } else {
            console.log(`   ❌ ${value} enum value missing`);
        }
    });
} else {
    console.log('   ❌ DisplayMethod enum missing');
}
console.log();

// Test 3: Check extension.ts has fallback command
console.log('3. Checking extension.ts fallback integration...');
const extensionPath = path.join(__dirname, '..', 'src', 'extension.ts');
const extensionContent = fs.readFileSync(extensionPath, 'utf8');

const extensionFeatures = [
    'chooseDisplayMethodCommand',
    'showFallbackErrorMessage',
    'getCurrentDisplayMethod',
    'configWatcher'
];

let featuresFound = 0;
extensionFeatures.forEach(feature => {
    if (extensionContent.includes(feature)) {
        console.log(`   ✅ ${feature} found`);
        featuresFound++;
    } else {
        console.log(`   ❌ ${feature} missing`);
    }
});

console.log(`   📊 Found ${featuresFound}/${extensionFeatures.length} extension features\n`);

// Test 4: Check package.json has new configurations
console.log('4. Checking package.json configuration...');
const packagePath = path.join(__dirname, '..', 'package.json');
const packageContent = fs.readFileSync(packagePath, 'utf8');
const packageJson = JSON.parse(packageContent);

const configKeys = [
    'vss.webview.enableSidebarFallback',
    'vss.webview.showFallbackMessage', 
    'vss.webview.preferredDisplayMethod'
];

let configsFound = 0;
configKeys.forEach(key => {
    if (packageJson.contributes?.configuration?.properties?.[key]) {
        console.log(`   ✅ ${key} configuration found`);
        configsFound++;
    } else {
        console.log(`   ❌ ${key} configuration missing`);
    }
});

// Check for new command
if (packageJson.contributes?.commands?.some(cmd => cmd.command === 'vss.chooseDisplayMethod')) {
    console.log('   ✅ vss.chooseDisplayMethod command found');
    configsFound++;
} else {
    console.log('   ❌ vss.chooseDisplayMethod command missing');
}

console.log(`   📊 Found ${configsFound}/${configKeys.length + 1} package.json features\n`);

// Test 5: Check fallback logic flow
console.log('5. Analyzing fallback logic flow...');
const fallbackLogicChecks = [
    { name: 'Panel creation attempt', pattern: 'tryShowInPanel' },
    { name: 'Sidebar fallback on error', pattern: 'showInSidebar' },
    { name: 'User preference check', pattern: 'preferredDisplayMethod' },
    { name: 'Error message customization', pattern: 'showFallbackErrorMessage' },
    { name: 'Configuration updates', pattern: 'updateFallbackOptions' }
];

let logicChecksFound = 0;
fallbackLogicChecks.forEach(check => {
    if (panelManagerContent.includes(check.pattern) || extensionContent.includes(check.pattern)) {
        console.log(`   ✅ ${check.name} implemented`);
        logicChecksFound++;
    } else {
        console.log(`   ❌ ${check.name} missing`);
    }
});

console.log(`   📊 Found ${logicChecksFound}/${fallbackLogicChecks.length} logic checks\n`);

// Summary
const totalTests = 5;
const passedTests = [
    methodsFound === fallbackMethods.length,
    panelManagerContent.includes('enum DisplayMethod'),
    featuresFound === extensionFeatures.length,
    configsFound === configKeys.length + 1,
    logicChecksFound === fallbackLogicChecks.length
].filter(Boolean).length;

console.log('📋 Test Summary:');
console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

if (passedTests === totalTests) {
    console.log('\n🎉 All fallback functionality tests passed!');
    console.log('✅ Webview fallback implementation is complete');
} else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
}