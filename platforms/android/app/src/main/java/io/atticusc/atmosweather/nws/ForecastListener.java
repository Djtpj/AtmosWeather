package io.atticusc.atmosweather.nws;

import android.content.Context;

import com.android.volley.Response;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import io.atticusc.atmosweather.R;
import io.atticusc.atmosweather.SimpleNotification;

public class ForecastListener implements Response.Listener<String> {
    private static final String[] severeWeatherTypes = {
            "severe",
            "tropical storm",
            "damage",
            "damaging",
            "hurricane",
            "tornado"
    };

    private static final String[] rainyWeatherTypes = {
            "storm",
            "rain",
            "shower"
    };

    private final boolean severeIndicate, rainIndicate;
    private final String locationName;
    private final Context context;

    public ForecastListener(boolean severeIndicate, boolean rainIndicate, String locationName, Context context) {
        this.severeIndicate = severeIndicate;
        this.rainIndicate = rainIndicate;
        this.locationName = locationName;
        this.context = context;
    }

    /**
     * @param periods the weather periods
     * @return a readable forecast for the user
     */
    private static String generateCompleteForecast(JSONArray periods) throws JSONException {
        StringBuilder builder = new StringBuilder();

        final int DEPTH = 2;
        for (int i = 0; i < DEPTH; i++) {
            JSONObject period = periods.getJSONObject(i);

            final String FORECAST_KEY = "detailedForecast";
            builder.append(period.getString(FORECAST_KEY));
        }

        return builder.toString();
    }

    private static boolean isSevereWeatherType(String request) {
        for (String requestType : severeWeatherTypes) {
            if (request.toLowerCase().contains(requestType)) {
                return true;
            }
        }

        return false;
    }

    private static boolean isRainyWeatherType(String request) {
        for (String rainType : rainyWeatherTypes) {
            if (request.toLowerCase().contains(rainType)) {
                return true;
            }
        }

        return false;
    }

    @Override
    public void onResponse(String response) {
        try {
            // Check settings and give notification if weather trigger words detected
            JSONObject jsonResponse = new JSONObject(response);
            JSONObject properties = jsonResponse.getJSONObject("properties");

            JSONArray periods = properties.getJSONArray("periods");

            String forecast = generateCompleteForecast(periods);

            boolean isSevere = isSevereWeatherType(forecast);
            boolean isRainy = isRainyWeatherType(forecast);

            if (isSevere && severeIndicate) {
                new SimpleNotification().Notify("Future Severe Weather Expected for " + locationName, jsonResponse.getString("detailedForecast"), "notification", context, R.drawable.future_icon, 2);
            } else if (isRainy && rainIndicate) {
                new SimpleNotification().Notify("Future Rain or Storms Expected for " + locationName, forecast, "notification", context, R.drawable.future_icon, 2);
            }
        } catch (Exception ignored) {

        }
    }
}
