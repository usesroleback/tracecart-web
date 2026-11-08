# Carrier guide

For transport companies, freight forwarders and couriers who carry for Tracecart, and for the Tracecart staff who approve them and ask them for prices. It describes what the website and the console do today.

## For carriers

### 1. Apply

Go to **Carry with Tracecart** (`/carry`, linked from the home page and the footer). Sign in or create an account first. Use the account you'll work with: once approved, it becomes your carrier account. You can still shop with it.

1. Fill in your company:
   - its name, country, city, address and phone, and your tax number if you have one;
   - the **transport modes** you run (road, air, sea, rail, multimodal);
   - the **countries you serve** (hold Ctrl or ⌘ to choose several);
   - **your vehicles**, in your own words.

   Choose **Start my application**.
2. Add each document marked with \*. By default these are your business registration, the owner's ID and your transport licence. Insurance and vehicle papers are welcome but optional. PDF or a photo, up to 10 MB each. A new file for the same document replaces the old one.
3. Choose **Send my application**. It shows **In review**.

A person at Tracecart checks each document. We email you when we decide:

- **Approved**: you carry for Tracecart. The page links to **My routes and rates** and **Quote requests**.
- **Changes asked**: the note says what's missing. Change it, add the document again, and send it again.
- **Not accepted**: the note says why.

Once approved, your company name, country and tax number stay as checked. Ask us to change them.

### 2. Your routes and rates

In the console, **My routes and rates** (`/routes`). **New route** asks for:

- **The route**: a name, the mode, the departure hub (or any) and the hub it delivers to.
- **When it runs**: transit days (shortest and longest), handling days, and the **departure days**. Leave them all unticked if it leaves any day. Arrival dates count from the next departure.
- **What it can carry**: the maximum weight, the longest package, the **largest load in m³**, and the goods you refuse. Leave a limit empty if you have none.
- **Rates**: the currency, a fixed fee per shipment, a minimum, a volumetric divisor, weight bands and surcharges by kind of goods. Without rates, you're asked to quote.

**Switch off** stops new work reaching a route. Only Tracecart sets a route's priority.

### 3. Quote requests

When a customer wants goods moved on a corridor you serve, Tracecart's freight desk may ask your price. You get an email and a notification. Open **Quote requests** (`/partner/quotes`).

A request shows:

- what the goods are, how many packages, the weight, the volume, the largest package and any care needed;
- the city and country it leaves from and goes to, and the day it's ready;
- a note from Tracecart, and the time to answer by.

You never see the customer's name, phone or address, the value of the goods, or what Tracecart charges the customer.

- **Send my price**: the amount and currency you charge Tracecart for the move, the shortest and longest transit, the day you can collect, and how long the price holds (7 days if left empty). You can change it while the request is open.
- **Decline this request**, saying why (no space this week, goods you don't carry…).
- A request you don't answer by its time expires.
- **Pause requests** stops new requests while your routes keep running. **Take requests again** resumes.

When the customer accepts a quote built on your price, the request shows **Yours** and the shipment appears in **Deliveries** at that price. From there you collect, move and deliver it as for any shipment.

### 4. Reporting an incident

**Notices** (`/partner/notices`) tells Tracecart's team something. Choose **Accident**, **Theft**, **Breakdown** or **Held at customs**, add the shipment number (TS-…) if it's about one, say what happened, and add photos.

- An incident on a shipment opens a problem for our team. They read it before the customer hears anything.
- Notices without a shipment are for news such as a border closure or a capacity change.

### 5. Suspension

If your account is suspended, your active routes are switched off at once and you can't change them. The email and the **Carry with Tracecart** page say why. When we reinstate you, the routes the suspension switched off come back on.

## For Tracecart staff

### Reviewing carriers

**Carrier applications** (`/carrier-applications`) needs the *Review carrier applications* permission: admins and logistics coordinators have it.

1. Open an application from the list. Filter it by status, or search a name or email.
2. Open each document. Each opening is recorded. Choose **Accept**, or **Refuse** with what's wrong; the carrier reads it.
3. Once every required document is accepted, **Approve**: the account becomes a carrier account for that company. Or write a note and **Ask for changes**, or **Refuse**. Nobody decides their own application.
4. **Suspend** an approved carrier with a reason: its active routes are switched off at once. **Reinstate** brings those back.

Below the list, **Documents required** sets what every carrier must provide. It needs the *settings* permission, and each change is recorded.

### Asking carriers for a price

On a freight request (**Freight**, then a reference), **Carriers** lists every active route of an approved carrier:

- First the routes that can take the cargo, then the others with why not: another country, too heavy, too bulky, refused goods, or a carrier that has paused requests.
- A limit that can't be checked yet, because the weight or volume isn't known, is said.
- Each route shows its next departure, its arrival window and its **rate card** price. That's what the carrier would charge Tracecart, never shown to the customer.

To ask:

1. Tick the routes.
2. Check **What the carriers see**:
   - packages, weight, volume, care;
   - a description of the goods. Check it against the photos, and keep names and phone numbers out of it;
   - a note.
3. Choose how long they have, and choose **Ask**.

Answers arrive as notifications and in the **Asked** list: the price, transit, collection day and how long it holds, or why the carrier declined. **Withdraw** cancels a request still open.

**Use in the quote** makes the firm quote rest on that carrier's price. The quote form says so, and you still set what the customer pays. When the customer accepts, the shipment goes to that carrier at that price. If the price expired before then, assign a carrier when the shipment is packed.
