export async function askAI(prompt: string) {

    const response = await fetch("/api/generate",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({
            prompt
        })

    });

    const json = await response.json();

    return json.answer;

}