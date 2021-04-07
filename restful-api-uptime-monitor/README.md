# RESTful API for Uptime Monitoring

* Pure Node.js; no external deps ... though we'll totally use Node's built-in modules
* Users can enter a URL and get SMS alerts when it goes down/comes back up
* Users can sign-up for accounts (and, logically, sign in/out of said accounts)

## Requirements

The API ...

1. Listens on a port and takes HTTP reqs (POST, GET, PUT, DELETE, HEAD)
2. Allows a client to connect, the create/edit/delete a user
3. Provides a signed-in user a token to use for auth'd requests
4. Invalidates the above token on sign-out
5. Lets a user create a new URL-check-task-thing (uptime monitor)
6. Lets a user edit or delete created checks with a max of N
7. Uses workers to check URLs and send SMS alerts to users when up/down state changes

We'll send SMS messages via Twilio without the 3rd party lib from the vendor 'cause reasons.

We're not using a DB; instead we'll just use the filesystem.
