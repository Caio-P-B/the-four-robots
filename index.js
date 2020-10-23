const robots = {
    input: require('./robots/input.js'),
    text: require('./robots/text.js'),
    state: require('./robots/state.js')
}
async function start() {
  
    robots.input()
    await robots.text()

    const content = robots.state.load()
    console.dir(content, { depth: null})

    const content = {
        maximumSentences: 7
    }

    content.searchTerm = askAndReturnSearchTerm()
    content.prefix = askAndReturnPrefix()

    await robots.text(content)

    function askAndReturnSearchTerm() {
        return readline.question('type a Wikipedia search term: ')
    }
    function askAndReturnPrefix() {
        const prefixes = ['Who is', 'What is', 'The history of']
        const selectedPrefixIndex = readline.keyInSelect(prefixes, 'Chose one option')
        const selectedPrefixText = prefixes[selectedPrefixIndex]

        return selectedPrefixText
    }
    
    console.log(JSON.stringify(content, null, 4))

}

start();
