# Projekt BAIM - łatanie podatności juice shop-a
## XSS
### channalge: DOM XSS i Bonus Payload
użycie podatej funkcji DOM sanitizer w search-result.component.ts
```
abstract bypassSecurityTrustHtml(value: string): SafeHtml;
    /**
     * Bypass security and trust the given value to be safe style value (CSS).
     * **WARNING:** calling this method with untrusted user data exposes your application to XSS
     * security risks!
     */
```

aby naprawić tą podatność wystarczyło dodać sanityzację parametru searchValue:

```
this.searchValue = this.sanitizer.sanitize(SecurityContext.URL,queryParam)
```

![jak widać żaden XSS się tym razem nie wykonał](image.png)

### challange: reflected XSS

![reflected xss w order history](image-3.png)
endpoint track-result?id= jest podatny na XSS,
pod spodem jest odpytanie /rest/track-order/ z trackOrders.ts, jest tam niesanityzowany parametr id, podatność można naprawić działając na zsanityzowanej kopii id:
```
const sanitized = security.sanitizeSecure(req.params.id)
```
po tej zmianie nie da sie wywołać refelcted XSS 

### challange: API  persisted XSS
Za pomocą otwartego endpointu /api/products można dodawać produkty i je przeglądać pod /rest/products/search

```
curl -X POST http://localhost:3000/api/products -H "Authorization: Bearer XXXXX" --data "name=payload2&description=<em>The</em><iframe src="javascript:alert(`xss`)">&price=1.99&deluxePrice=1.99&image=banana_juice.jpg"
```
![Produkt dodał się do listy po API](image-1.png)


![za pomocą tego polecenia można dodać stored XSSa](image-2.png)

aby naprawić tą podatność wystarczyło dodać sanityzację w search-result.component.ts:
```
tableData[i].description = this.sanitizer.sanitize(SecurityContext.HTML,tableData[i].description)
```

### challange: persisted xss user challage

podczas modyfikacji nazwy użytkownika metodą POST '/profile', updateUserProfile.ts wywkoływana jest funckja user.update:
```
set (username: string) {
          if (utils.isChallengeEnabled(challenges.persistedXssUserChallenge)) {
            username = security.sanitizeLegacy(username)
          } else {
            username = security.sanitizeSecure(username)
          }
          this.setDataValue('username', username)

...
export const sanitizeLegacy = (input = '') => input.replace(/<(?:\w+)\W+?[\w]/gi, '')
```
funckja sanitize legacy pozwala na </p><p s<<p simg src="x" onerror="alert('demo')" /></img>

### Challange: presisted XSS server side protection
za pomocą odpowiednio spreparowanego POST na /api/Feedbacks/ możemy wymusić zamieszczenie komentarza z XSS: 
```
{"UserId":1,"captchaId":0,"captcha":"486","comment":"<<iframe src=\"javascript:alert(`xss`)\">iframe src=\"javascript:alert(`xss`)\">","rating":"2"}
```

wynik:
```
"status":"success","data":{"id":15,"UserId":1,"comment":"<iframe src=\"javascript:alert(`xss`)\">","rating":2,"updatedAt":"2025-04-27T22:41:47.598Z","createdAt":"2025-04-27T22:41:47.598Z"}
```

![wykona się na stronie /about](image-5.png)
wynika to z wykorzystania podatnej funkcji w implementacji feedback.ts która nie sanityzuje rekursywnie
```
export const sanitizeHtml = (html: string) => sanitizeHtmlLib(html)
```
zamiana tego na "sanitizedComment = security.sanitizeSecure(comment)" eliminuje możliwość xss


## INNE

### NOSQL manipulation
za pomocą metody PATCH można wysłać w JSONie obiekt który zwróci dopasowanie do wielu dokumentów w mongodb
```
PATCH /rest/products/reviews 
Authorization: Bearer XXX

{
  "id": { "$gt": "" },
  "message": "All reviews have been overwritten!"
}

```
można za pomocą tego nadpisać wiele wpisów na raz 

![POC](image-4.png)

aby naprawić te podatnośc wystarczy wprowadzić weryfikację czy typ ID jest taki sam jak typ przesłanego ID

```
const id = typeof req.body.id === 'string'
    ? new String(req.body.id)
    : null;
    if (!id) throw new Error('Invalid id')
```
###