// Places API hatası. `lib/places.ts` ve `lib/places.mock.ts` ortak kullanır.

export class PlacesError extends Error {
  readonly httpStatus: number | null;

  constructor(message: string, httpStatus: number | null = null) {
    super(message);
    this.name = "PlacesError";
    this.httpStatus = httpStatus;
  }
}
