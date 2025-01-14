const parameters = {
  client_user: {
    cid: 'client_id',
    uid: 'user_id',
    dl: 'document_location',
    dp: 'page_path',
    dr: 'referrer',
    tid: 'stream_id'
  },
  event_prefixes: {
    'ep.': 'string',
    'epn.': 'numbers',
    'epb.': 'boolean',
    'ept.': 'dates',
    'epd.': 'doubles'
  },
  event: {
    en: 'event_name',
    transaction_id: 'transaction_id',
    value: 'value',
    tax: 'tax',
    shipping: 'shipping',
    cu: 'currency',
    coupon: 'coupon',
    creative_name: 'creative_name',
    creative_slot: 'creative_slot',
    promotion_id: 'promotion_id',
    promotion_name: 'promotion_name',
    item_list_id: 'item_list_id',
    item_list_name: 'item_list_name',
    search_term: 'search_term',
    achievement_id: 'achievement_id',
    payment_type: 'payment_type',
    virtual_currency_namevirtual_currency_name: 'virtual_currency_name',
    group_id: 'group_id',
    level_name: 'level_name',
    success: 'success',
    level: 'level',
    character: 'character',
    method: 'method',
    score: 'score',
    content_type: 'content_type',
    content_id: 'content_id'

  },
  items: {
    id: 'item_id',
    nm: 'item_name',
    af: 'affiliation',
    cp: 'coupon',
    ds: 'discount',
    lp: 'index',
    br: 'item_brand',
    ca: 'item_category',
    c2: 'item_category2',
    c3: 'item_category3',
    c4: 'item_category4',
    c5: 'item_category5',
    li: 'item_list_id',
    ln: 'item_list_name',
    va: 'item_variant',
    lo: 'location_id',
    pr: 'price',
    qt: 'quantity',
    pi: 'promo_id',
    pn: 'promo_name'
  }
}

const requiredParameters = {
  client_user: {
    client_id: true,
    document_location: true,
    stream_id: true
  },
  specific_events: {
    add_payment_info: {
      event_parameters: {
        currency: true,
        value: true
      },
      items: true
    },
    add_shipping_info: {
      event_parameters: {
        currency: true,
        value: true
      },
      items: true
    },
    add_to_cart: {
      event_parameters: {
        currency: true,
        value: true
      },
      items: true
    },
    add_to_wishlist: {
      event_parameters: {
        currency: true,
        value: true
      },
      items: true
    },
    begin_checkout: {
      event_parameters: {
        currency: true,
        value: true
      },
      items: true
    },
    generate_lead: {
      event_parameters: {
        currency: true,
        value: true
      },
    },
    post_score: {
      event_parameters: {
        score: true
      },
    },
    purchase: {
      event_parameters: {
        currency: true,
        transaction_id: true,
        value: true
      },
      items: true
    },
    refund: {
      event_parameters: {
        currency: true,
        transaction_id: true,
        value: true
      },
    },
    remove_from_cart: {
      event_parameters: {
        currency: true,
        value: true
      },
      items: true
    },
    search: {
      event_parameters: {
        search_term: true
      },
    },
    select_item: {
      items: true
    },
    spend_virtual_currency: {
      event_parameters: {
        value: true,
        virtual_currency_name: true
      },
    },
    unlock_achievement: {
      event_parameters: {
        achievement_id: true
      },
    },
    view_cart: {
      event_parameters: {
        currency: true,
        value: true
      },
      items: true
    },
    view_item: {
      event_parameters: {
        currency: true,
        value: true
      },
      items: true
    },
    view_promotion: {},
    view_item_list: {
      items: true
    }
  },
  item: {
    item_id: true,
    item_name: true
  },
}
module.exports = {
  parameters, requiredParameters
}
