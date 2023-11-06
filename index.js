const settings = require("./settings.json");

const https = require('https');
const axios = require("axios").default;

async function getGist(gist_id) {
    try {
        const res = await axios.get(`https://api.github.com/gists/${gist_id}`, {
            headers: {
                Authorization: `Bearer ${settings.github_auth}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });

        return res.data;
    } catch (error) {
        console.error(error)
    }
}

async function makeGetRequest(url, rejectUnauthorized = true) {
    const agent = new https.Agent(
        {
            rejectUnauthorized: rejectUnauthorized
        }
    )
    try {
        const res = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0" },
            httpsAgent: agent
        });

        return res.data;
    } catch (error) {
        console.error(error)
    }
}

async function writeToGrabifyGist(content) {
    try {
        const data = { "files": { "grabify_domains.txt": { "content": content } } }
        const res = await axios.patch(`https://api.github.com/gists/2021ddeea0a43a07b746215749797287`, data, {
            headers: {
                Authorization: `Bearer ${settings.github_auth}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });

        return res.data;
    } catch (error) {
        console.error(error)
    }
}

async function createGistComment(gist_id, comment) {
    try {
        const data = { "body": comment }
        const res = await axios.post(`https://api.github.com/gists/${gist_id}/comments`, data, {
            headers: {
                Authorization: `Bearer ${settings.github_auth}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });

        return res.data;
    } catch (error) {
        console.error(error)
    }
}

async function doUpdateGist() {
    console.log(`${new Date().toISOString()} | Checking for updates to Grabify's domains`);
    let gistData = (await getGist("2021ddeea0a43a07b746215749797287"))["files"]["grabify_domains.txt"]["content"];
    if ( gistData == "" ) { gistData = [] }
    else {gistData = gistData.split("\n")}

    const grabifyDomainsData = await makeGetRequest('https://grabify.link/api/domains?r=124', false);
    const grabifyDomains = grabifyDomainsData.map(i => {
        return i["Domain"]
    })
    if ( grabifyDomains == [''] ) { grabifyDomains = [] }

    const addedDomains = grabifyDomains.filter(x => !gistData.includes(x));
    const addedDomainsFormatted = `Added domains ${addedDomains.join(', ')}`;
    const removedDomains = gistData.filter(x => !grabifyDomains.includes(x));
    const removedDomainsFormatted = `Removed domains ${removedDomains.join(', ')}`;

    if ( grabifyDomains.length > 0 && ( addedDomains.length > 0 || removedDomains.length > 0 ) ) {
        await writeToGrabifyGist(grabifyDomains.join("\n"));
        const comment = (addedDomains.length > 0 ? addedDomainsFormatted + "\n" : "") + (removedDomains.length > 0 ? removedDomainsFormatted : "")
        await createGistComment("2021ddeea0a43a07b746215749797287", comment)
        console.log(`${new Date().toISOString()} | gist updates: ${addedDomainsFormatted} ${removedDomainsFormatted}`);
    } else { console.log(`${new Date().toISOString()} | No updates, not updating Gist`); }

}

(async function () {
    console.log(`${new Date().toISOString()} | Starting daily interval loop and running once`);
    await doUpdateGist();
    setInterval(doUpdateGist, 1000 * 60 * 60 * 24);
})();