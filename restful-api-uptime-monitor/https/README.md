# PEM'less

I set up an https verision of this uptime monitor app thing using a self-signed cert. You may notice the `.pem` files are missing.

Yes, the cert is self-signed. Yes, it "secures" nothing but localhost. But ... seriously. No PEM files here.

If for God-knows-whatever-reason you're cloning out this repo and trying to get this thing to stand up, you can either:

1. Create your own self-signed cert to secure localhost (`./https/cert.pem` and `./https/key.pem`), or
2. Just use http and comment out the https stuff
