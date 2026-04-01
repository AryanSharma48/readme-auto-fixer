const fs = require("fs");

function getDefaultContent(section) {
    switch (section) {
        case "description":
            return "A brief description of your project, its purpose, and what problem it solves.";

        case "installation":
            return "Follow these steps to install the project locally:\n\n```bash\nnpm install\n```";

        case "usage":
            return "Run the following command to start the project:\n\n```bash\nnpm start\n```";

        case "dependencies":
            return "This project depends on the following packages:\n\n- List dependencies here";

        case "folder structure":
            return "Project structure:\n\n```\nsrc/\n  ├── index.js\n  └── ...\n```";

        case "license":
            return "This project is licensed under the MIT License.";

        case "built by":
            const username = process.env.GITHUB_ACTOR || "Aryan Sharma";
            return `Built with ❤️ by @${username}`;

        default:
            return "";
    }
}

try{
    const data = fs.readFileSync("README.md", "utf-8");
    const sections = data.split("## ");
    const sectionMap = {};

    const intro = sections[0].trim();
    sections.slice(1).forEach(section => {
        const lines = section.split("\n");
        const title = lines[0].trim().toLowerCase();
        const content = lines.slice(1).join("\n").trim(); 
                                    
        sectionMap[title] = content;
    });

    const requiredSections = [
    "description",
    "installation",
    "usage",
    "dependencies",
    "folder structure",
    "built by"
    ];

    requiredSections.forEach(section => {
        if(!(section in sectionMap))
            {sectionMap[section] = getDefaultContent(section);}    
    });

    function formatTitle(title) {
        return title
            .split(" ")
            .map(word => word[0].toUpperCase() + word.slice(1))
            .join(" ");
    }

    let newReadme = intro ?  intro + "\n\n" : "";
    requiredSections.forEach(section => {
        newReadme += `## ${formatTitle(section)}\n${sectionMap[section]}\n\n`;
    });

    Object.keys(sectionMap).forEach(section => {
        if (!requiredSections.includes(section)) {
            newReadme += `## ${formatTitle(section)}\n\n ${sectionMap[section]}\n\n`;
        }
    });

    if(data !== newReadme){
        fs.writeFileSync("README.md", newReadme, "utf-8");
        console.log("README.md has been updated!");
    }else{
        console.log("README.md is already up to date.");
    }

} catch(err){
    console.error("Error reading the file:", err);
}