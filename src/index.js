const fs = require("fs");

try{
    const data = fs.readFileSync("README.md", "utf-8");
    const sections = data.split("## ");
    const sectionMap = {};

    sections.slice(1).forEach(section => {
        const lines = section.split("\n");
        const title = lines[0].trim().toLowerCase();
        const content = lines.slice(1).join("\n").trim(); 
                                    
        sectionMap[title] = content;
    });

    console.log(sectionMap);

    
} catch(err){
    console.error("Error reading the file:", err);
}