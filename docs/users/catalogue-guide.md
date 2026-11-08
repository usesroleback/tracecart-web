# Catalogue team guide

For people who keep Tracecart's catalogue: catalogue managers, and anyone with the catalogue permissions in the console. It covers categories, and how to record what a part fits and what that rests on. It describes what the console does today.

Open the console and choose **Catalogue**. You see **Categories** if you can read the catalogue; you change things if you can write it.

## 1. Categories

**Catalogue → Categories** shows the tree: the fifteen departments at the top, their categories below. Choose a category's name to open it.

- **Add a category:** fill in the names (French and English), a slug (lowercase, with dashes, as it will appear in the address) and its parent, then choose **Add**.
- **Switch off** hides a category and everything under it from the store. Its products stay in the console.
- **Name and description:** open the category and change the names, or write the description shown at the top of its page in the store, in both languages. Choose **Save**.
- **What its products fit:** for parts, choose what they fit: **A vehicle**, **A device** (laptop, phone…) or **An appliance**. Its products, and those of its subcategories, then show **Will it fit?** in the store (see section 3). Leave it on **Nothing (or inherited)** for everything else. Car parts, computer accessories and components, phone parts, cases and chargers, and appliance parts are already set.
- **Attributes** (the details customers filter on, such as voltage, size or memory) are listed under each category. Add one with its key, labels, type, unit and options.

## 2. What a claim rests on

Tracecart never tells a customer a part fits without evidence. Every link between products, and everything a part is listed to fit, says what it rests on:

| Choose | When | Customers see |
| --- | --- | --- |
| **Manufacturer document** | A manufacturer's catalogue, spec sheet or compatibility list says so. **Name it** in Reference (e.g. "Ferrona catalogue 2026, p. 41"). | Verified |
| **OEM reference** | The part's original-equipment reference is the one the vehicle or device calls for. **Give the reference** (e.g. "OEM 04465-02220"). | Verified |
| **Tested by Tracecart** | Someone at Tracecart tried it on the real thing. Say how in Reference. | Verified |
| **Seller's word only** | The seller says so; nobody at Tracecart checked. | May fit |
| **No evidence yet** | Anything else, including links made before evidence existed. | May fit |

The reference is shown to customers: write it for them. The console won't save a manufacturer document or an OEM reference without one. The console records who set verifying evidence and when. Choosing a weaker kind later clears that, and the store shows "May fit" at once.

Never choose a verifying kind because two products look alike, share a size, or share a brand. That's a reason to check, not evidence.

## 3. What a part fits

Open a product (**Catalogue → Products**) and go to **Fits (vehicles, devices, appliances)**. Each line is one thing a variant fits:

1. Choose the **variant** (SKU) and the **kind**: Vehicle, Device or Appliance. It must match what its category fits.
2. Fill in the **make** (or brand) and the **model** as customers write them: "Toyota" and "Corolla", "Dell" and "Latitude 5420", "LG" and "F4V5VYP0W" (the model number on the appliance's label).
3. For a vehicle, give the **years** (first and last; leave one empty for an open range). Add the **engine or version** only when the fit depends on it ("1.4 HDi"): customers are then asked for it.
4. Choose what it rests on, and its reference (section 2). Choose **Add**.

What customers get:
- The product page lists each line, **Verified** or **May fit**, with its evidence.
- Customers can check their own vehicle, device or appliance on the page.
- **Parts for my…** finds every part listed for it, verified first.

Matching ignores case, accents, spaces and dashes ("Golf VII" is "golf-vii"), but never matches a close model: a line for "Corolla" says nothing about "Corolla Verso". Add a line for each model.

To correct a line, remove it and add it again. Removing a line, or a link, takes it off the store at once.

## 4. Links between products

Under **Compatibility** on a product, link one of its variants to another product's variant (by SKU):

| Link | Means |
| --- | --- |
| Fits | A battery fits a tool. |
| Charges | A charger charges a battery. |
| Replaces | A spare part replaces a worn one. |
| Is an accessory for | An accessory for another product. |
| Is a consumable for | Discs, blades, bits, electrodes… |
| Is often bought with | Products often bought together. |
| Is a part of | A part of the other product. |
| Is equivalent to | The same part under another reference. |

Choose what the link rests on (section 2) as you add it. The product page groups linked products by kind, and says for each group whether it's **Verified** or **May fit: not verified yet**.
