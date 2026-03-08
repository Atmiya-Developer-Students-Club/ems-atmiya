import figlet from "figlet";

export async function logFiglet(text: string) {
  // figlet doesn't work properly in browser - only run on server
  if (typeof window !== 'undefined') {
    // Simple fallback for browser console
    console.log(`%c${text}`, 'font-size: 20px; font-weight: bold; color: #6366f1;');
    return;
  }
  
  try {
    const ascii = await figlet.text(text, {
      font: "3-d",
      horizontalLayout: "default",
      verticalLayout: "default",
    });

    console.log(ascii);
  } catch (error) {
    // Silently fail - this is just cosmetic
    console.log(text);
  }
}
