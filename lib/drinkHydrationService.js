// Drink hydration data
const drinkData = {
  "drinks": [
    {
      "name": "water",
      "aliases": ["h2o", "tap water", "bottled water", "spring water", "mineral water", "distilled water", "filtered water"],
      "tip": "Perfect choice! Water is the gold standard for hydration. It's calorie-free, helps regulate body temperature, and supports every bodily function. Keep up the great work! 💧",
      "category": "excellent"
    },
    {
      "name": "coffee",
      "aliases": ["latte", "espresso", "cappuccino", "americano", "mocha", "black coffee"],
      "tip": "Coffee provides hydration but contains caffeine which can be dehydrating in large amounts. Moderation is key - enjoy your coffee but balance it with water! ☕",
      "category": "moderate"
    },
    {
      "name": "tea",
      "aliases": ["green tea", "black tea", "herbal tea", "chamomile", "peppermint tea", "oolong tea"],
      "tip": "Tea is excellent for hydration and contains antioxidants! Herbal teas are caffeine-free and provide additional health benefits. Great choice! 🫖",
      "category": "excellent"
    },
    {
      "name": "milk",
      "aliases": ["whole milk", "skim milk", "almond milk", "soy milk", "oat milk", "coconut milk"],
      "tip": "Milk provides hydration along with protein, calcium, and vitamins! It's especially good for recovery after exercise. A nutritious choice! 🥛",
      "category": "excellent"
    },
    {
      "name": "soda",
      "aliases": ["coke", "pepsi", "sprite", "fanta", "dr pepper", "mountain dew", "root beer", "ginger ale", "7up"],
      "tip": "Soda contains water but the high sugar content and phosphoric acid can actually interfere with proper hydration. The sugar spikes blood glucose and the acid can affect calcium absorption. Water is always a better choice! 🥤",
      "category": "poor"
    },
    {
      "name": "energy drinks",
      "aliases": ["red bull", "monster", "rockstar", "bang", "5 hour energy", "n.o.x", "full throttle"],
      "tip": "Energy drinks contain high levels of caffeine and sugar that can increase heart rate and blood pressure. While they provide some hydration, the caffeine can cause energy crashes and dehydration. Water is always a better choice! ⚡",
      "category": "poor"
    },
    {
      "name": "juice",
      "aliases": ["orange juice", "apple juice", "grape juice", "cranberry juice", "pineapple juice", "tomato juice", "vegetable juice"],
      "tip": "Juice provides vitamins and hydration, but even natural sugars can spike blood glucose. Whole fruits are better as they contain fiber. Consider diluting juice with water or choosing whole fruits instead! 🍊",
      "category": "moderate"
    },
    {
      "name": "sports drinks",
      "aliases": ["gatorade", "powerade", "vitamin water", "bodyarmor", "pedialyte", "liquid iv"],
      "tip": "Sports drinks are great for intense exercise lasting over 1 hour or when you're sweating heavily. They replace electrolytes lost through sweat. Many contain sugar and artificial dyes, so plain water is better for regular hydration! 🏃‍♂️",
      "category": "good"
    },
    {
      "name": "alcohol",
      "aliases": ["beer", "wine", "vodka", "whiskey", "rum", "gin", "tequila"],
      "tip": "Alcohol is a diuretic that actually dehydrates your body. For every alcoholic drink, drink a glass of water to help maintain hydration. Moderation is key! 🍺",
      "category": "dehydrating"
    },
    {
      "name": "smoothie",
      "aliases": ["fruit smoothie", "protein smoothie", "green smoothie", "yogurt smoothie"],
      "tip": "Smoothies provide hydration along with vitamins, fiber, and protein! They're a great way to get nutrients and stay hydrated. Just watch the sugar content! 🥤",
      "category": "good"
    },
    {
      "name": "sparkling water",
      "aliases": ["seltzer", "club soda", "mineral water", "bubbly water"],
      "tip": "Sparkling water is a great alternative to soda! It provides the same hydration as still water with a satisfying fizz. Just avoid tonic water which contains quinine and sugar. 💨",
      "category": "excellent"
    },
    {
      "name": "diet soda",
      "aliases": ["diet coke", "diet pepsi", "zero sugar", "sugar-free soda"],
      "tip": "Diet soda provides hydration without calories, but some studies suggest artificial sweeteners like aspartame may affect gut health. Consider sparkling water as a healthier alternative with the same fizz! 🥤",
      "category": "moderate"
    },
    {
      "name": "kombucha",
      "aliases": ["fermented tea", "probiotic drink"],
      "tip": "Kombucha provides hydration and probiotics for gut health! It's lower in sugar than soda but still contains some sugar and trace alcohol. A great choice for digestive health and hydration! 🫖",
      "category": "good"
    },
    {
      "name": "hot chocolate",
      "aliases": ["chocolate milk", "cocoa", "mocha", "chocolate drink"],
      "tip": "Hot chocolate provides comfort and some hydration! It's higher in calories than water, but the milk content provides nutrients. Chocolate drinks are rarely ideal hydration sources, but they can be an occasional treat! ☕",
      "category": "moderate"
    },
    {
      "name": "matcha",
      "aliases": ["green tea powder", "matcha latte", "ceremonial grade matcha"],
      "tip": "Matcha is packed with antioxidants and provides steady energy without the jitters of coffee. It's excellent for hydration and contains L-theanine for focus. Note: it does contain caffeine like coffee! 🍵",
      "category": "excellent"
    },
    {
      "name": "dandelion tea",
      "aliases": ["dandelion root tea", "detox tea"],
      "tip": "Dandelion tea is great for liver health and digestion! It's naturally caffeine-free and has diuretic properties that can help with water retention. Note: the diuretic effect may reduce short-term hydration! 🌼",
      "category": "moderate"
    },
    {
      "name": "nettle tea",
      "aliases": ["stinging nettle tea", "herbal tea"],
      "tip": "Nettle tea is rich in vitamins and minerals! It's great for allergies and provides excellent hydration. A nutrient-packed choice for overall health! 🌿",
      "category": "excellent"
    },
    {
      "name": "tonic water",
      "aliases": ["quinine water", "indian tonic water"],
      "tip": "Tonic water contains quinine, sugar, and/or artificial sweeteners. While it provides some hydration, it's not ideal due to the added ingredients. Consider sparkling water instead! 🥤",
      "category": "poor"
    }
  ],
  "categories": {
    "excellent": {
      "description": "Perfect hydration choice with additional health benefits",
      "color": "#22C55E"
    },
    "good": {
      "description": "Good for hydration with some nutritional value",
      "color": "#3B82F6"
    },
    "moderate": {
      "description": "Provides hydration but consider healthier alternatives",
      "color": "#F59E0B"
    },
    "poor": {
      "description": "Limited hydration benefits with potential health drawbacks",
      "color": "#EF4444"
    },
    "dehydrating": {
      "description": "Actually dehydrates the body - drink water to compensate",
      "color": "#DC2626"
    }
  }
};

class DrinkHydrationService {
  constructor() {
    this.drinks = drinkData.drinks;
    this.categories = drinkData.categories;
  }

  // Find the best matching drink for a given drink name
  findDrinkMatch(drinkName) {
    if (!drinkName) return null;
    
    const normalizedName = drinkName.toLowerCase().trim();
    
    // First, try exact match
    let match = this.drinks.find(drink => 
      drink.name.toLowerCase() === normalizedName ||
      drink.aliases.some(alias => alias.toLowerCase() === normalizedName)
    );
    
    if (match) return match;
    
    // If no exact match, try partial matching
    match = this.drinks.find(drink => 
      drink.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(drink.name.toLowerCase()) ||
      drink.aliases.some(alias => 
        alias.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(alias.toLowerCase())
      )
    );
    
    if (match) return match;
    
    // If still no match, try fuzzy matching for common variations
    const commonVariations = {
      'coffee': ['latte', 'espresso', 'cappuccino', 'americano', 'mocha'],
      'tea': ['green tea', 'black tea', 'herbal tea', 'chamomile'],
      'water': ['h2o', 'bottled water', 'tap water', 'spring water'],
      'soda': ['coke', 'pepsi', 'sprite', 'fanta', 'dr pepper'],
      'energy drink': ['red bull', 'monster', 'rockstar', 'bang'],
      'juice': ['orange juice', 'apple juice', 'grape juice'],
      'milk': ['whole milk', 'skim milk', 'almond milk', 'soy milk'],
      'alcohol': ['beer', 'wine', 'vodka', 'whiskey', 'rum'],
      'smoothie': ['fruit smoothie', 'protein smoothie', 'green smoothie'],
      'sports drink': ['gatorade', 'powerade', 'vitamin water']
    };
    
    for (const [category, variations] of Object.entries(commonVariations)) {
      if (variations.some(variation => 
        normalizedName.includes(variation.toLowerCase()) ||
        variation.toLowerCase().includes(normalizedName)
      )) {
        match = this.drinks.find(drink => drink.name === category);
        if (match) return match;
      }
    }
    
    return null;
  }

  // Get hydration tip for a drink
  getHydrationTip(drinkName) {
    const drink = this.findDrinkMatch(drinkName);
    
    if (!drink) {
      return {
        tip: "We couldn't find specific hydration info for this drink. Remember, water is always the best choice for hydration! 💧",
        category: "unknown",
        color: "#6B7280",
        drinkName: drinkName
      };
    }
    
    const categoryInfo = this.categories[drink.category];
    
    return {
      tip: drink.tip,
      category: drink.category,
      color: categoryInfo.color,
      drinkName: drink.name,
      categoryDescription: categoryInfo.description
    };
  }

  // Get all drinks for debugging
  getAllDrinks() {
    return this.drinks;
  }

  // Get category info
  getCategoryInfo(category) {
    return this.categories[category];
  }
}

// Create singleton instance
const drinkHydrationService = new DrinkHydrationService();

export default drinkHydrationService; 