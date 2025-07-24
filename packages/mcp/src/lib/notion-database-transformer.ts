import { NotionToMarkdown } from "notion-to-md";
import { Client } from "@notionhq/client";

export function addDatabaseTransformer(n2m: NotionToMarkdown, notion: Client) {
  n2m.setCustomTransformer("child_database", async (block) => {
    try {
      // Get database info
      const databaseId = block.id;
      const database = await notion.databases.retrieve({ database_id: databaseId });
      
      // Get first 3 rows
      const response = await notion.databases.query({
        database_id: databaseId,
        page_size: 3,
      });

      const title = (database as any).title?.[0]?.plain_text || "Untitled Database";
      
      // Build XML output
      let xml = `<database id="${databaseId}" title="${title}">\n`;
      
      // Add property headers
      const properties = Object.entries(database.properties);
      xml += "  <properties>\n";
      properties.forEach(([name, prop]) => {
        xml += `    <property name="${name}" type="${prop.type}" />\n`;
      });
      xml += "  </properties>\n";
      
      // Add rows
      xml += "  <rows>\n";
      response.results.forEach((page: any, index) => {
        xml += `    <row id="${page.id}" index="${index}">\n`;
        
        Object.entries(page.properties).forEach(([propName, propValue]: [string, any]) => {
          let value = "";
          switch (propValue.type) {
            case "title":
              value = propValue.title?.[0]?.plain_text || "";
              break;
            case "rich_text":
              value = propValue.rich_text?.[0]?.plain_text || "";
              break;
            case "number":
              value = propValue.number?.toString() || "";
              break;
            case "select":
              value = propValue.select?.name || "";
              break;
            case "multi_select":
              value = propValue.multi_select?.map((s: any) => s.name).join(", ") || "";
              break;
            case "date":
              value = propValue.date?.start || "";
              break;
            case "checkbox":
              value = propValue.checkbox?.toString() || "";
              break;
            // Add more property types as needed
            default:
              value = JSON.stringify(propValue[propValue.type]) || "";
          }
          xml += `      <cell property="${propName}">${value}</cell>\n`;
        });
        
        xml += "    </row>\n";
      });
      xml += "  </rows>\n";
      xml += "</database>";
      
      return xml;
    } catch (error) {
      console.error("Error rendering database:", error);
      return `<database id="${block.id}" error="Failed to render database" />`;
    }
  });
}
