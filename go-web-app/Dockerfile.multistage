FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

COPY . .

RUN go build -v -o /usr/local/bin/app ./...

FROM gcr.io/distroless/static-debian13:nonroot

WORKDIR /app

COPY --from=builder /usr/local/bin/app /app/app

COPY --from=builder /app/static /app/static

EXPOSE 8080

CMD ["/app/app"]
