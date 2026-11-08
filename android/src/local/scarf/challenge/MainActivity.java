package local.scarf.challenge;

import android.app.Activity;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView shelfView;
    private int shelfBottom;
    private boolean pageReady;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        shelfView = new WebView(this);
        WebSettings settings = shelfView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        shelfView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                pushShelfBottom();
            }
        });
        shelfView.setBackgroundColor(0xFF24344F);
        shelfView.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
                int left;
                int top;
                int right;
                int bottom = largestBottom(insets);
                if (Build.VERSION.SDK_INT >= 30) {
                    Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                    left = bars.left;
                    top = bars.top;
                    right = bars.right;
                } else {
                    left = insets.getSystemWindowInsetLeft();
                    top = insets.getSystemWindowInsetTop();
                    right = insets.getSystemWindowInsetRight();
                }
                if (Build.VERSION.SDK_INT >= 35 && bottom < 1) {
                    bottom = Math.round(48f * getResources().getDisplayMetrics().density);
                }
                shelfBottom = bottom;
                view.setPadding(left, top, right, 0);
                pushShelfBottom();
                if (Build.VERSION.SDK_INT >= 30) {
                    return WindowInsets.CONSUMED;
                }
                return insets.consumeSystemWindowInsets();
            }
        });
        setContentView(shelfView);
        shelfView.addJavascriptInterface(new ShelfLeave(), "ScarfShelf");
        shelfView.post(new Runnable() {
            @Override
            public void run() {
                shelfView.requestApplyInsets();
            }
        });
        shelfView.loadUrl("file:///android_asset/index.html");
    }

    private int largestBottom(WindowInsets insets) {
        if (Build.VERSION.SDK_INT >= 30) {
            int bottom = insets.getInsets(WindowInsets.Type.systemBars()).bottom;
            int nav = insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
            int gesture = insets.getInsets(WindowInsets.Type.mandatorySystemGestures()).bottom;
            if (nav > bottom) bottom = nav;
            if (gesture > bottom) bottom = gesture;
            return bottom;
        }
        return insets.getSystemWindowInsetBottom();
    }

    private void pushShelfBottom() {
        if (shelfView == null || !pageReady) return;
        shelfView.evaluateJavascript(
                "document.documentElement.style.setProperty('--shelf-bottom','" + shelfBottom + "px');" +
                "document.documentElement.style.setProperty('--button-drop','1')",
                null);
    }

    private final class ShelfLeave {
        @JavascriptInterface
        public void leave() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    finish();
                }
            });
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (shelfView != null) {
            shelfView.requestApplyInsets();
        }
    }
}
