class AmazonEnums{

    static enumsItemsConditionsNumbersFirst = {
        0: 'New',
        1: 'Renewed',
        2: 'Rental',
        3: 'Used - Like New or Open Box',
        4: 'Used - Very Good',
        5: 'Used - Good',
        6: 'Used - Acceptable'
    }

    static enumsItemsConditionsTextFirst = {
        'New': 0,
        'Renewed': 1,
        'Rental': 2,
        'Used - Like New or Open Box': 3,
        'Used - Very Good': 4,
        'Used - Good': 5,
        'Used - Acceptable': 6
    }

    static getNumberFromText(text){
        return AmazonEnums.enumsItemsConditionsTextFirst[text]
    }

    static getTextFromNumber(number){
        return AmazonEnums.enumsItemsConditionsNumbersFirst[number]
    }
}

module.exports = AmazonEnums;