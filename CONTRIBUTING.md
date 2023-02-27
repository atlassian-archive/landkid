# CONTRIBUTING

## Getting Started

This is copied from `development-local-github.md` in the atlassian frontend landkid deployment repo with atlassian specific info stripped out.

### Setting up a repo

First you'll need to have a repo to test in that is under your name. So [create a repo in Bitbucket](https://bitbucket.org/repo/create). Ensure the owner is set to yourself. Use any Repository name you like. It can be private if you prefer. Select "Include a README Yes" and hit Create Repository.

Now you'll need to set up Pipelines. On the sidebar you should see a `Pipelines` button, click that. It will ask which kind of build you wish to create, select `Javascript`. It should have a sample config in front of you. Replace it with:

```yml
image: node:18

pipelines:
  default: # This is the default branch build
    - step:
        script:
          - echo "Default pipelines script"
          - sleep 5

  custom: # This is the landkid build we will run
    landkid:
      - step:
          script:
            - echo "This is a landkid build"
            - sleep 5
```

Confirm that and you should have Pipelines running.

### Set up a public tunnel

See the atlassian frontend landkid deployment repo docs for more info.

### Creating oauth keys

Next you'll need to create an Oauth token and key for your local landkid. These are used to register your local landkid as an Oauth consumer (this lets your app ask users for their usernames when they login).

Head to your personal workspace by clicking your profile icon and selecting the [workspace with your name](https://bitbucket.org/[username]/). Go to the workspace [settings](https://bitbucket.org/[username]/workspace/settings) and move to the "OAuth consumers" tab. Under "OAuth consumers" click "Add consumer".

Fill in a Name (e.g "Landkid local"). Fill in the callback url using your tunnel url from above with `/auth/callback` on the end (e.g `https://<your-tunnel-domain>/auth/callback`). Make sure "This is a private consumer" is selected. And select the `Account Read` permissions. Everything else can be skipped.

This will give you a `Key` and `Secret` which you'll need in a moment.

### Creating your config

Next copy and paste the `example.config.js` file in your checked out https://github.com/atlassian/landkid repo and name it `config.js`. This will be your local landkid config and is gitignored. Make sure this is **never** checked in, because it will contain your OAuth key and secret!

Next we need to get a couple more pieces of information.

The easiest way to get your UUID and the repo UUID is:

1. Browse to your test repo -> Repository settings
2. Click 'OpenID Connect' under Pipelines in the sidebar
3. Repository UUID will be displayed. If the test repo is under your personal workspace, then the Workspace UUID will be your own UUID.
4. If the test repo is not under your workspace. Repeat the same steps but with a repository under your workspace to grab your own UUID.

Now we can edit the config. Change the following fields:

- `baseUrl` - change to your tunnel url (e.g `https://<your-tunnel-domain>`)
- `landkidAdmins` - change this to an array that contains your uuid. These people will get admin status as soon as they login to your landkid instance
- `repoConfig` - set owner and name to your name and repo respectively. Add in your repo uuid from earlier (this just makes start up be slightly faster because we don't need to do the extra lookup)
- `deployment.oAuth` - set the key and secret from earlier (you can leave everything else there)

That's it!

### Setting up databases

Landkid uses two data bases, a redis and postgres. In local development, I find it's easier to _not_ fiddle around with the postgres database, so you can actually not connect that up and landkid will use a local sqllite database instead. It's not _exactly_ the same as whats running in production, but I find it easier to use personally.

To get both databases running you should just be able to run

```
docker-compose up
```

and that will have both running for you (though we wont use the postgres one for now).

I'd also reccomend installing [DBBrowser for SQLite](https://sqlitebrowser.org/) to help to look at your local sqllite database.

By default, landkid will use the sqlite database. To make it use postgres, add the following config entry to your config.js:

```
  sequelize: {
    database: 'postgres',
    dialect: 'postgres',
    username: 'postgres',
    password: process.env.PG_DB_PASSWORD,
    host: '0.0.0.0',
    port: '5434',
  },
```

### Running Landkid

All that's left now is to run `Landkid`.

```
yarn dev
```

This is spinning up two servers, a node express server for the backend and a webpack-dev-server for the front end (running on ports 8080 and 3000 respectively). You'll always talk directly to the frontend though as it will proxy any backend requests that need proxying.

You should now be able to head to your tunnel url and be able to see Landkid running! When your first open it you'll be asked to authorize your OAuth app you created earlier, then you'll be in. If you look at the `System` tab, you should see yourself as an admin user.

You can run landkid with different ports for the `backend server` and the `webpack-dev-server` using the `SERVER_PORT` and `DEV_SERVER_PORT` variables respectively.

```
SERVER_PORT="8081" DEV_SERVER_PORT="9001" yarn dev
# can now access the application on port 9001
```

### Installing your local landkid addon

Now you'll need to install your landkid addon into bitbucket. Note: landkid is an `account` addon, that means it installed under a users accounts and affects all of their repo's they own and will be visible to all users who view it. For that reason you can only install landkid for a repo you control.

First you might like to familiarise yourself with Landkid's `atlassian-connect.json` file by heading to `https://<your-tunnel-domain>/ac`. This is the metadata we are sending to bitbucket to install our adddon.

Head to you Bitbucket Settings and go to [Installed Apps](https://bitbucket.org/account/user/[your_username]/addon-management).

Now click `Install app from URL` and paste your url from above and click install. You should get an authorization dialog and then that's it.

You should now be able to go to a Pull Request in your repo (I usually use the BB ui to edit the readme file and use that to create a PR) and you should see your addon running. You'll be able to approve your own PRs when running a local instance to make testing easier.
