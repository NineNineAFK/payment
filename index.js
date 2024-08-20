require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const URL = process.env.URL; 
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PRODUCT_ID = process.env.PRODUCT_ID
const app = express();
//app.use(bodyParser.json()); // since we are using webhooks it requires data to be sent and received in raw binary format.
                            // therefore we use express.raw(), scroll down. it sents data in raw format. get it fat u fat fuck?

const BUY_HTML = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
      input[type="submit"] {
        height: 40px;
        width: 200px;
        border: none;
        border-radius: 5px;
        background-color: #0070f3;
        color: #fff;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <form action="${URL}/create-checkout-session" method="POST">
      <input type="submit" value="Buy WittCepter $10" />
    </form>
  </body>
  </html>`;


app.get("/",(req, res)=>{
    res.send(BUY_HTML);
})
// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Order Model
const Order = mongoose.model('Order', new mongoose.Schema({
    productId: { type: String,  },
    productName: { type: String,  },
    amount: { type: Number,  },
    currency: { type: String,  },
    status: { type: String,  },
    paymentIntentId: { type: String },
    customerEmail: { type: String,  },
    customerName: { type: String,  },
    paymentMethodTypes: { type: [String],  },
    purchasedAt: { type: Date, default: Date.now } 
}));

// Stripe Checkout Endpoint
app.post('/create-checkout-session', async (req, res) => {
//    const { productId } = req.body;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: PRODUCT_ID, // Stripe Price ID
                quantity: 1
            }],
            mode: 'payment',
            success_url: `${URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${URL}/cancel`
        });
        //res.redirect(303,session.url)
        res.json({ id: session.id, url:session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stripe Webhook for Payment Confirmation and db logging after confirming events cuh
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
        
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            // fetching session details cuh
            const sessionDetails = await stripe.checkout.sessions.retrieve(session.id);

            console.log('Checkout session completed!', sessionDetails);

            //  data from the session details cuh
            const order = new Order({
                productId: session.id,
                productName: session.metadata.productName, // Access the product name from metadata (nahi ho raha )
                amount: session.amount_total,
                currency: session.currency,
                status: session.payment_status,
                paymentIntentId: session.payment_intent,
                customerEmail: session.customer_details.email, 
                customerName: session.customer_details.name,   
                paymentMethodTypes: session.payment_method_types, 
                purchasedAt: new Date()  // Automatically 
              });

            await order.save();
            console.log('Order saved:', order);

        } else {
            console.log('Unhandled event type:', event.type);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('Error handling webhook event:', err.message);
        res.sendStatus(400);
    }
});





app.get('/success', async (req, res) => {
   
    res.send(`<html><body><h1>Thanks for your order, </h1></body></html>`);
  });

  app.get('/cancel', (req, res) => {
    res.send('<h1>Cancelled</h1>');
  });


// Start Server
app.listen(3000, () => console.log('Server running on port 3000'));
