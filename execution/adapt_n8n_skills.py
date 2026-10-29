import os
import yaml
import shutil
import re

source_dir = ".tmp/n8n-skills/skills"
plugin_dest = r"C:\Users\herek\.gemini\config\plugins\n8n-mcp-skills"

def adapt_skills():
    if not os.path.exists(source_dir):
        print(f"Source dir {source_dir} not found.")
        return

    for skill_folder in os.listdir(source_dir):
        skill_path = os.path.join(source_dir, skill_folder)
        if not os.path.isdir(skill_path):
            continue
        
        # New name generation: prepend 'gerenciando-' to make it a gerund if not already
        if skill_folder.startswith("n8n-"):
            new_name = "gerenciando-" + skill_folder
        else:
            new_name = "utilizando-" + skill_folder
            
        new_skill_path = os.path.join(source_dir, new_name)
        
        skill_md_path = os.path.join(skill_path, "SKILL.md")
        if os.path.exists(skill_md_path):
            with open(skill_md_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Parse frontmatter
            parts = content.split("---")
            if len(parts) >= 3:
                try:
                    frontmatter = yaml.safe_load(parts[1])
                    body = "---".join(parts[2:])
                    
                    # Update frontmatter
                    frontmatter['name'] = new_name
                    
                    # Update body: append checklist
                    checklist = """\n\n## Fluxo de Trabalho (Workflow)\n- [ ] Ler documentação ou nodes atuais\n- [ ] Planejar as modificações necessárias\n- [ ] Validar a configuração do Node n8n (`validate_node` ou `validate_workflow`)\n- [ ] Executar a alteração (`n8n_update_partial_workflow`)\n- [ ] Em caso de erro, usar comando local com `--help` ou buscar logs.\n"""
                    body += checklist
                    
                    new_content = "---\n" + yaml.dump(frontmatter, allow_unicode=True, sort_keys=False) + "---\n" + body
                    
                    with open(skill_md_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                except Exception as e:
                    print(f"Error parsing {skill_md_path}: {e}")
        
        # Create required optional folders
        for sub_folder in ['scripts', 'examples', 'resources']:
            os.makedirs(os.path.join(skill_path, sub_folder), exist_ok=True)
            
        # Rename directory to match new name
        if skill_path != new_skill_path:
            os.rename(skill_path, new_skill_path)
            
    print("Skills adaptadas com sucesso!")
    
    # Move to plugins folder
    if os.path.exists(plugin_dest):
        shutil.rmtree(plugin_dest)
        
    shutil.copytree(".tmp/n8n-skills", plugin_dest)
    print(f"Plugin copiado para {plugin_dest}")

if __name__ == "__main__":
    adapt_skills()
