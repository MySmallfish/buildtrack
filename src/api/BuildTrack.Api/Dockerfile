# BuildTrack API Dockerfile for Render deployment
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
# Render provides the PORT environment variable at runtime
# Expose 8080 which we bind to in the final stage
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["src/api/BuildTrack.Api/BuildTrack.Api.csproj", "src/api/BuildTrack.Api/"]
COPY ["src/api/BuildTrack.Domain/BuildTrack.Domain.csproj", "src/api/BuildTrack.Domain/"]
COPY ["src/api/BuildTrack.Infrastructure/BuildTrack.Infrastructure.csproj", "src/api/BuildTrack.Infrastructure/"]
RUN dotnet restore "src/api/BuildTrack.Api/BuildTrack.Api.csproj"
COPY . .
WORKDIR "/src/src/api/BuildTrack.Api"
RUN dotnet publish "BuildTrack.Api.csproj" -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "BuildTrack.Api.dll"]
