const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../.tmp/n8n-skills/skills');
const pluginDest = 'C:\\Users\\herek\\.gemini\\config\\plugins\\n8n-mcp-skills';

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
        const fromPath = path.join(from, element);
        const toPath = path.join(to, element);
        if (fs.lstatSync(fromPath).isFile()) {
            fs.copyFileSync(fromPath, toPath);
        } else {
            copyFolderSync(fromPath, toPath);
        }
    });
}

function adaptSkills() {
    if (!fs.existsSync(sourceDir)) {
        console.log(`Source dir ${sourceDir} not found.`);
        return;
    }

    const folders = fs.readdirSync(sourceDir);
    for (const folder of folders) {
        const skillPath = path.join(sourceDir, folder);
        if (!fs.statSync(skillPath).isDirectory()) continue;
        
        let newName = folder.startsWith('n8n-') ? 'gerenciando-' + folder : 'utilizando-' + folder;
        const newSkillPath = path.join(sourceDir, newName);
        
        const skillMdPath = path.join(skillPath, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
            let content = fs.readFileSync(skillMdPath, 'utf8');
            
            // replace name in frontmatter
            content = content.replace(/name:\s*([^\n]+)/, `name: ${newName}`);
            
            const checklist = `\n\n## Fluxo de Trabalho (Workflow)\n- [ ] Ler documentação ou nodes atuais\n- [ ] Planejar as modificações necessárias\n- [ ] Validar a configuração do Node n8n (\`validate_node\` ou \`validate_workflow\`)\n- [ ] Executar a alteração (\`n8n_update_partial_workflow\`)\n- [ ] Em caso de erro, usar comando local com \`--help\` ou buscar logs.\n`;
            
            content += checklist;
            fs.writeFileSync(skillMdPath, content, 'utf8');
        }
        
        // create subfolders
        ['scripts', 'examples', 'resources'].forEach(sub => {
            const subPath = path.join(skillPath, sub);
            if (!fs.existsSync(subPath)) fs.mkdirSync(subPath);
        });
        
        if (skillPath !== newSkillPath) {
            try {
                fs.renameSync(skillPath, newSkillPath);
            } catch (e) {
                fs.cpSync(skillPath, newSkillPath, { recursive: true });
                fs.rmSync(skillPath, { recursive: true, force: true });
            }
        }
    }
    console.log('Skills adaptadas!');

    if (fs.existsSync(pluginDest)) {
        fs.rmSync(pluginDest, { recursive: true, force: true });
    }
    
    copyFolderSync(path.join(__dirname, '../.tmp/n8n-skills'), pluginDest);
    console.log(`Plugin copiado para ${pluginDest}`);
}

adaptSkills();
