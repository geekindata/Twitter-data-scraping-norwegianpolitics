const needle = require("needle");
// The code below sets the bearer token from your environment variables
// To set environment variables on macOS or Linux, run the export command below from the terminal:
// export BEARER_TOKEN='YOUR-TOKEN'

const token = process.env.BEARER_TOKEN;
const id = "list-id";

const endpointURL = `https://api.twitter.com/2/lists/${id}/followers`;

async function getRequest() {
  // These are the parameters for the API request
  // by default, only the User ID and name are returned
  const params = {
    "user.fields": "pinned_tweet_id,created_at", // Edit optional query parameters here
    expansions: "pinned_tweet_id", // expansions is used to include the Tweet object
    "tweet.fields": "created_at", // Edit optional query parameters here
  };

  // this is the HTTP header that adds bearer token authentication
  const res = await needle("get", endpointURL, params, {
    headers: {
      "User-Agent": "v2ListFollowersLookupJS",
      authorization: `Bearer ${token}`,
    },
  });

  if (res.body) {
    return res.body;
  } else {
    throw new Error("Unsuccessful request");
  }
}

(async () => {
  try {
    // Make request
    const response = await getRequest();
    console.dir(response, {
      depth: null,
    });
  } catch (e) {
    console.log(e);
    process.exit(-1);
  }
  process.exit();
})();
